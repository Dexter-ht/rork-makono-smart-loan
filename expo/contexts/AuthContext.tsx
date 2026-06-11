import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, OTP, NotificationPreferences } from '@/types/loan';

export const [AuthContext, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [users, setUsers] = useState<User[]>([]);
  const [otps, setOtps] = useState<OTP[]>([]);

  const seedAdminAccounts = async () => {
    const admins = [
      { email: 'admin@makono.com', password: 'admin123', name: 'Super Admin', phone: '1234567890', role: 'super_admin' as const },
      { email: 'viewer@makono.com', password: 'viewer123', name: 'Admin Viewer', phone: '0987654321', role: 'admin_viewer' as const },
    ];

    for (const admin of admins) {
      const { data: existingProfile } = await supabase.from('profiles').select('id').eq('email', admin.email).single();
      if (existingProfile) continue;

      const { data, error } = await supabase.auth.signUp({
        email: admin.email,
        password: admin.password,
        options: { data: { name: admin.name, phone: admin.phone } },
      });

      if (error) {
        console.warn(`Failed to create admin ${admin.email}:`, error.message);
        continue;
      }

      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          name: admin.name,
          phone: admin.phone,
          email: admin.email,
          role: admin.role,
        }, { onConflict: 'id' });
        console.log(`Admin account created: ${admin.email} / ${admin.password}`);
      }
    }

    console.log('Default admin accounts ready:\n  Super Admin: admin@makono.com / admin123\n  Admin Viewer: viewer@makono.com / viewer123');
  };

  const loadUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) {
        console.error('Failed to load users:', error.message);
        return;
      }

      if (!data || data.length === 0) {
        await seedAdminAccounts();
        const { data: refreshed } = await supabase.from('profiles').select('*');
        if (refreshed && refreshed.length > 0) {
          const mapped: User[] = refreshed.map(p => ({
            id: p.id,
            name: p.name,
            phone: p.phone,
            email: p.email ?? '',
            isAdmin: p.role === 'super_admin' || p.role === 'admin_viewer',
            role: p.role as User['role'],
            invitedBy: p.invited_by ?? undefined,
            createdAt: p.created_at ?? new Date().toISOString(),
            notificationPreferences: (p.notification_preferences as unknown as NotificationPreferences) ?? { email: true, sms: true, whatsapp: true },
          }));
          setUsers(mapped);
        }
        return;
      }

      const mapped: User[] = data.map(p => ({
        id: p.id,
        name: p.name,
        phone: p.phone,
        email: p.email ?? '',
        isAdmin: p.role === 'super_admin' || p.role === 'admin_viewer',
        role: p.role as User['role'],
        invitedBy: p.invited_by ?? undefined,
        createdAt: p.created_at ?? new Date().toISOString(),
        notificationPreferences: (p.notification_preferences as unknown as NotificationPreferences) ?? { email: true, sms: true, whatsapp: true },
      }));
      setUsers(mapped);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }, []);

  const loadOtps = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('otps').select('*').eq('user_id', user.id);
      if (error) {
        console.error('Failed to load OTPs:', error.message);
        return;
      }
      setOtps((data ?? []).map(o => ({
        userId: o.user_id,
        code: o.code,
        expiresAt: o.expires_at,
        verified: o.verified ?? false,
      })));
    } catch (error) {
      console.error('Failed to load OTPs:', error);
    }
  }, [user]);

  const fetchProfile = useCallback(async (userId: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (error || !data) return null;

      const profile: User = {
        id: data.id,
        name: data.name,
        phone: data.phone,
        email: data.email ?? '',
        isAdmin: data.role === 'super_admin' || data.role === 'admin_viewer',
        role: data.role as User['role'],
        invitedBy: data.invited_by ?? undefined,
        createdAt: data.created_at ?? new Date().toISOString(),
        notificationPreferences: (data.notification_preferences as unknown as NotificationPreferences) ?? { email: true, sms: true, whatsapp: true },
      };
      return profile;
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        if (profile) {
          setUser(profile);
        } else {
          const baseProfile: User = {
            id: session.user.id,
            name: session.user.user_metadata?.name ?? '',
            phone: session.user.user_metadata?.phone ?? '',
            email: session.user.email ?? '',
            isAdmin: false,
            role: 'user',
            createdAt: new Date().toISOString(),
          };
          setUser(baseProfile);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    loadUsers();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile, loadUsers]);

  useEffect(() => {
    if (user) {
      loadOtps();
    }
  }, [user, loadOtps]);

  const register = async (
    name: string,
    phone: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; userId?: string; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, phone },
        },
      });

      if (error) {
        if (error.message?.includes('already registered') || error.message?.includes('already exists')) {
          return { success: false, error: 'A user with this email already exists' };
        }
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'Registration failed' };
      }

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        name,
        phone,
        email,
        role: 'user',
      }, { onConflict: 'id' });

      if (profileError) {
        console.error('Failed to create profile:', profileError.message);
      }

      console.log('User registered successfully:', email);
      await loadUsers();
      return { success: true, userId: data.user.id };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Registration failed' };
    }
  };

  const generateOTP = async (userId: string): Promise<{ success: boolean; otp?: string; error?: string }> => {
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await supabase.from('otps').delete().eq('user_id', userId);

      const { error } = await supabase.from('otps').insert({
        user_id: userId,
        code,
        expires_at: expiresAt,
        verified: false,
      });

      if (error) {
        console.error('Failed to generate OTP:', error.message);
        return { success: false, error: 'Failed to generate OTP' };
      }

      console.log(`OTP for user ${userId}: ${code}`);
      return { success: true, otp: code };
    } catch (error) {
      console.error('Failed to generate OTP:', error);
      return { success: false, error: 'Failed to generate OTP' };
    }
  };

  const verifyOTP = async (userId: string, code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase
        .from('otps')
        .select('*')
        .eq('user_id', userId)
        .eq('code', code)
        .single();

      if (error || !data) {
        return { success: false, error: 'Invalid OTP code' };
      }

      if (new Date(data.expires_at) < new Date()) {
        return { success: false, error: 'OTP has expired' };
      }

      await supabase.from('otps').update({ verified: true }).eq('user_id', userId).eq('code', code);

      const profile = await fetchProfile(userId);
      if (profile) {
        setUser(profile);
      }

      return { success: true };
    } catch (error) {
      console.error('OTP verification error:', error);
      return { success: false, error: 'Verification failed' };
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; userId?: string; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message?.includes('Invalid login credentials')) {
          return { success: false, error: 'Invalid email or password' };
        }
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'Login failed' };
      }

      const profile = await fetchProfile(data.user.id);
      if (profile) {
        setUser(profile);
      }

      console.log('Login successful for:', email);
      return { success: true, userId: data.user.id };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const inviteAdmin = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user || user.role !== 'super_admin') {
        return { success: false, error: 'Only super admins can invite other admins' };
      }

      const tempPassword = Math.random().toString(36).slice(-8);

      const { data, error } = await supabase.auth.signUp({
        email,
        password: tempPassword,
      });

      if (error) {
        if (error.message?.includes('already registered')) {
          const { data: existingProfiles } = await supabase.from('profiles').select('id').eq('email', email).single();
          if (existingProfiles) {
            await supabase.from('profiles').update({ role: 'admin_viewer', invited_by: user.id }).eq('id', existingProfiles.id);
            await loadUsers();
            return { success: true };
          }
          return { success: false, error: 'User with this email already exists' };
        }
        return { success: false, error: error.message };
      }

      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          name: 'Admin Viewer',
          phone: '',
          email,
          role: 'admin_viewer',
          invited_by: user.id,
        }, { onConflict: 'id' });
      }

      await loadUsers();
      console.log(`Invited admin viewer: ${email} with temporary password: ${tempPassword}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to invite admin:', error);
      return { success: false, error: 'Failed to send invitation' };
    }
  };

  const createAccount = async (
    name: string,
    email: string,
    phone: string,
    role: 'admin_viewer' | 'user'
  ): Promise<{ success: boolean; password?: string; error?: string }> => {
    try {
      if (!user || user.role !== 'super_admin') {
        return { success: false, error: 'Only the super administrator can create accounts' };
      }

      if (role !== 'admin_viewer' && role !== 'user') {
        return { success: false, error: 'Invalid role' };
      }

      const tempPassword = Math.random().toString(36).slice(-8);

      const { data, error } = await supabase.auth.signUp({
        email,
        password: tempPassword,
      });

      if (error) {
        if (error.message?.includes('already registered')) {
          const { data: existingProfiles } = await supabase.from('profiles').select('id').eq('email', email).single();
          if (existingProfiles) {
            await supabase.from('profiles').update({
              name,
              phone,
              role,
              invited_by: user.id,
            }).eq('id', existingProfiles.id);
            await loadUsers();
            return { success: true, password: tempPassword };
          }
          return { success: false, error: 'User with this email already exists' };
        }
        return { success: false, error: error.message };
      }

      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          name,
          phone,
          email,
          role,
          invited_by: user.id,
        }, { onConflict: 'id' });
      }

      await loadUsers();
      console.log(`Created ${role} account: ${email} with temporary password: ${tempPassword}`);
      return { success: true, password: tempPassword };
    } catch (error) {
      console.error('Failed to create account:', error);
      return { success: false, error: 'Failed to create account' };
    }
  };

  const getAllAdmins = useCallback((): User[] => {
    return users.filter(u => u.role === 'admin_viewer');
  }, [users]);

  const getAllUsers = useCallback((): User[] => {
    return users;
  }, [users]);

  const getUserById = useCallback((userId: string): User | undefined => {
    return users.find(u => u.id === userId);
  }, [users]);

  const updateNotificationPreferences = async (userId: string, prefs: NotificationPreferences): Promise<boolean> => {
    try {
      const { error } = await supabase.from('profiles').update({
        notification_preferences: JSON.parse(JSON.stringify(prefs)),
      }).eq('id', userId);

      if (error) {
        console.error('Failed to update notification preferences:', error.message);
        return false;
      }

      if (user?.id === userId) {
        setUser(prev => prev ? { ...prev, notificationPreferences: prefs } : null);
      }

      await loadUsers();
      return true;
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      return false;
    }
  };

  const getSuperAdmin = useCallback((): User | undefined => {
    return users.find(u => u.role === 'super_admin');
  }, [users]);

  const isSuperAdmin = useCallback((): boolean => {
    return user?.role === 'super_admin';
  }, [user]);

  const canApproveLoans = useCallback((): boolean => {
    return user?.role === 'super_admin';
  }, [user]);

  const canUploadPayment = useCallback((): boolean => {
    return user?.role === 'super_admin';
  }, [user]);

  const isAdminViewer = useCallback((): boolean => {
    return user?.role === 'admin_viewer';
  }, [user]);

  return {
    user,
    isLoading,
    register,
    generateOTP,
    verifyOTP,
    login,
    logout,
    inviteAdmin,
    createAccount,
    getAllUsers,
    getUserById,
    getAllAdmins,
    updateNotificationPreferences,
    getSuperAdmin,
    isSuperAdmin,
    isAdminViewer,
    canApproveLoans,
    canUploadPayment,
  };
});
