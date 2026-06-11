// Makono Smart Loan - Notification Service
// Handles external notification delivery via Cloudflare Worker and device URL schemes.

import { Linking, Platform, Alert } from "react-native";
import { User } from "@/types/loan";

const FUNCTIONS_URL = process.env.EXPO_PUBLIC_RORK_FUNCTIONS_URL || "";

export type NotificationChannel = "email" | "sms" | "whatsapp";

export interface ExternalNotification {
  to: string;
  channel: NotificationChannel;
  subject: string;
  message: string;
  recipientName?: string;
  loanId?: string;
}

/**
 * Send a notification via the Cloudflare Worker backend.
 * Falls back to device URL schemes (mailto:, sms:, whatsapp://) if the worker is unreachable.
 */
export async function sendExternalNotification(
  notification: ExternalNotification
): Promise<{ success: boolean; channel: NotificationChannel; error?: string }> {
  // Try the backend worker first
  if (FUNCTIONS_URL) {
    try {
      const res = await fetch(`${FUNCTIONS_URL}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notification),
      });

      if (res.ok) {
        const data = await res.json();
        console.log(`[NotificationService] Worker sent ${notification.channel} to ${notification.to}`);
        return { success: true, channel: notification.channel };
      }
      console.warn("[NotificationService] Worker returned error, falling back to device scheme");
    } catch (err) {
      console.warn("[NotificationService] Worker unreachable, using device fallback:", err);
    }
  }

  // Device URL scheme fallback
  return sendViaDeviceScheme(notification);
}

/**
 * Send notification via device URL scheme (mailto, sms, whatsapp).
 */
async function sendViaDeviceScheme(
  notification: ExternalNotification
): Promise<{ success: boolean; channel: NotificationChannel; error?: string }> {
  try {
    let url: string;

    switch (notification.channel) {
      case "email":
        url = `mailto:${encodeURIComponent(notification.to)}?subject=${encodeURIComponent(notification.subject)}&body=${encodeURIComponent(notification.message)}`;
        break;
      case "sms":
        url = Platform.OS === "android"
          ? `sms:${notification.to}?body=${encodeURIComponent(notification.message)}`
          : `sms:${notification.to}&body=${encodeURIComponent(notification.message)}`;
        break;
      case "whatsapp": {
        const phone = notification.to.replace(/[^0-9]/g, "");
        url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(notification.message)}`;
        break;
      }
    }

    const canOpen = await Linking.canOpenURL(url);

    if (canOpen) {
      await Linking.openURL(url);
      console.log(`[NotificationService] Opened ${notification.channel} composer for ${notification.to}`);
      return { success: true, channel: notification.channel };
    }

    // For WhatsApp, try the web fallback
    if (notification.channel === "whatsapp") {
      const phone = notification.to.replace(/[^0-9]/g, "");
      const webUrl = `https://wa.me/${phone}?text=${encodeURIComponent(notification.message)}`;
      const canOpenWeb = await Linking.canOpenURL(webUrl);
      if (canOpenWeb) {
        await Linking.openURL(webUrl);
        return { success: true, channel: notification.channel };
      }
    }

    console.warn(`[NotificationService] Cannot open ${notification.channel} URL scheme`);
    return { success: false, channel: notification.channel, error: `${notification.channel} app not available` };
  } catch (err) {
    console.error(`[NotificationService] Device scheme error:`, err);
    return { success: false, channel: notification.channel, error: "Failed to open app" };
  }
}

/**
 * Send notification to a user across all their enabled channels.
 */
export async function sendToAllUserChannels(
  user: User,
  subject: string,
  message: string,
  loanId?: string
): Promise<{ email: boolean; sms: boolean; whatsapp: boolean }> {
  const prefs = user.notificationPreferences;
  const results = { email: false, sms: false, whatsapp: false };

  const channels: { channel: NotificationChannel; enabled: boolean; to: string }[] = [
    { channel: "email", enabled: prefs?.email ?? true, to: user.email },
    { channel: "sms", enabled: prefs?.sms ?? true, to: user.phone },
    { channel: "whatsapp", enabled: prefs?.whatsapp ?? true, to: user.phone },
  ];

  for (const { channel, enabled, to } of channels) {
    if (!enabled || !to) continue;

    const result = await sendExternalNotification({
      to,
      channel,
      subject,
      message,
      recipientName: user.name,
      loanId,
    });

    results[channel] = result.success;
  }

  return results;
}

/**
 * Build a due-date reminder message for a borrower.
 */
export function buildDueDateReminderMessage(
  userName: string,
  loanType: string,
  amount: number,
  totalPayable: number,
  dueDate: string,
  daysUntilDue: number,
  loanId: string
): { subject: string; message: string } {
  const formattedDueDate = new Date(dueDate).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return {
    subject: `Makono Loan - Payment Due in ${daysUntilDue} Days`,
    message: `Dear ${userName},

This is an automated reminder from Makono Smart Loan regarding your ${loanType} loan (ID: ${loanId.substring(0, 12)}...).

Loan Amount: MKW ${amount.toLocaleString()}
Total Payable: MKW ${totalPayable.toFixed(2)}
Due Date: ${formattedDueDate} (${daysUntilDue} days remaining)

Please ensure your payment is ready by the due date to avoid late payment penalties (2% of total payable).

If you have already made payment, please upload your proof of payment via the Makono app or disregard this reminder.

For any questions, contact Makono support.

Thank you for choosing Makono Smart Loan.`,
  };
}

/**
 * Build an overdue payment message.
 */
export function buildOverdueMessage(
  userName: string,
  loanType: string,
  amount: number,
  totalPayable: number,
  penalty: number,
  dueDate: string,
  loanId: string
): { subject: string; message: string } {
  return {
    subject: "Makono Loan - Payment Overdue - Action Required",
    message: `Dear ${userName},

URGENT: Your ${loanType} loan payment (ID: ${loanId.substring(0, 12)}...) with Makono Smart Loan is now OVERDUE.

Loan Amount: MKW ${amount.toLocaleString()}
Total Payable: MKW ${totalPayable.toFixed(2)}
Original Due Date: ${new Date(dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
Late Payment Penalty: MKW ${penalty.toFixed(2)} (2%)

Please settle your outstanding balance immediately to avoid further penalties or collection proceedings.

If you have already made payment, please upload your proof of payment via the Makono app.

Contact Makono support immediately if you need to discuss your repayment options.

Makono Smart Loan`,
  };
}

/**
 * Build a loan approval notification message.
 */
export function buildApprovalMessage(
  userName: string,
  loanType: string,
  amount: number,
  totalPayable: number,
  repaymentPeriod: number,
  interestRate: number,
  loanId: string
): { subject: string; message: string } {
  return {
    subject: "Makono Loan - Application Approved!",
    message: `Dear ${userName},

Congratulations! Your ${loanType} loan application with Makono Smart Loan has been APPROVED.

Loan Details:
- Loan ID: ${loanId.substring(0, 12)}...
- Loan Amount: MKW ${amount.toLocaleString()}
- Interest Rate: ${interestRate}% monthly
- Repayment Period: ${repaymentPeriod} months
- Total Payable: MKW ${totalPayable.toFixed(2)}

Please log into the Makono app to acknowledge receipt of funds once disbursed.

Thank you for choosing Makono Smart Loan.`,
  };
}

/**
 * Build a loan disbursement notification message.
 */
export function buildDisbursementMessage(
  userName: string,
  loanType: string,
  amount: number,
  totalPayable: number,
  dueDate: string,
  loanId: string
): { subject: string; message: string } {
  return {
    subject: "Makono Loan - Funds Disbursed",
    message: `Dear ${userName},

Your ${loanType} loan of MKW ${amount.toLocaleString()} from Makono Smart Loan has been DISBURSED.

Total Repayment: MKW ${totalPayable.toFixed(2)}
Due Date: ${new Date(dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}

Please ensure timely repayment to maintain a good credit record with Makono.

Makono Smart Loan`,
  };
}

/**
 * Build an interest rate change notification message.
 */
export function buildRateChangeMessage(
  userName: string,
  oldRate: number,
  newRate: number
): { subject: string; message: string } {
  const direction = newRate > oldRate ? "increased" : "decreased";
  return {
    subject: `Makono - Interest Rate ${direction === "increased" ? "Increase" : "Decrease"} Notice`,
    message: `Dear ${userName},

Please be informed that Makono Smart Loan has ${direction} the monthly interest rate from ${oldRate}% to ${newRate}%.

This change takes effect immediately and applies to new loan applications only. Existing approved loans retain their original interest rates.

For more information, please contact Makono support.

Makono Smart Loan`,
  };
}

/**
 * Build a rollover notification message.
 */
export function buildRolloverMessage(
  userName: string,
  originalAmount: number,
  paidAmount: number,
  remainingPrincipal: number,
  rolloverTotalPayable: number,
  rolloverPeriod: number,
  interestRate: number,
  rolloverLoanId: string
): { subject: string; message: string } {
  return {
    subject: "Makono Loan - Roll-over Created",
    message: `Dear ${userName},

Your partial payment has been received and a roll-over loan has been created for your remaining balance with Makono Smart Loan.

Original Loan: MKW ${originalAmount.toLocaleString()}
Amount Paid: MKW ${paidAmount.toLocaleString()}
Remaining Principal: MKW ${remainingPrincipal.toLocaleString()}
Roll-over Interest Rate: ${interestRate}% monthly
Roll-over Period: ${rolloverPeriod} months
New Total Payable: MKW ${rolloverTotalPayable.toFixed(2)}
New Loan ID: ${rolloverLoanId.substring(0, 12)}...

Please ensure timely repayment of your roll-over loan.

Makono Smart Loan`,
  };
}

/**
 * Build a generic adjustment notification message.
 */
export function buildAdjustmentMessage(
  userName: string,
  adjustmentType: string,
  details: string,
  loanId?: string
): { subject: string; message: string } {
  return {
    subject: `Makono - Account Adjustment: ${adjustmentType}`,
    message: `Dear ${userName},

An adjustment has been made to your Makono Smart Loan account${loanId ? ` (Loan ID: ${loanId.substring(0, 12)}...)` : ""}.

Adjustment Type: ${adjustmentType}
Details: ${details}

Please review this change in the Makono app. Contact support if you have any questions.

Makono Smart Loan`,
  };
}

/**
 * Check if WhatsApp is available on the device.
 */
export async function isWhatsAppAvailable(): Promise<boolean> {
  try {
    return await Linking.canOpenURL("whatsapp://send");
  } catch {
    return false;
  }
}
