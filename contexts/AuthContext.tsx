import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, OTP } from '@/types/loan';

const STORAGE_KEYS = {
  USER: 'makono_user',
  USERS: 'makono_users',
  OTPS: 'makono_otps',
} as const;

const hashPassword = (password: string): string => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  let result = '';
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(data[i]);
  }
  return btoa(result);
};

const verifyPassword = (password: string, hashedPassword: string): boolean => {
  return hashPassword(password) === hashedPassword;
};

export const [AuthContext, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [users, setUsers] = useState<User[]>([]);
  const [otps, setOtps] = useState<OTP[]>([]);

  useEffect(() => {
    loadUser();
    loadUsers();
    loadOtps();
  }, []);

  const loadUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const storedUsers = await AsyncStorage.getItem(STORAGE_KEYS.USERS);
      if (storedUsers) {
        const parsedUsers = JSON.parse(storedUsers);
        console.log('Loaded users from storage:', parsedUsers.length);
        setUsers(parsedUsers);
      } else {
        console.log('No users found, creating default admin');
        const adminUser: User = {
          id: 'admin-1',
          name: 'Admin User',
          phone: '1234567890',
          email: 'admin@makono.com',
          password: hashPassword('admin123'),
          isAdmin: true,
          role: 'super_admin',
          createdAt: new Date().toISOString(),
        };
        setUsers([adminUser]);
        await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([adminUser]));
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadOtps = async () => {
    try {
      const storedOtps = await AsyncStorage.getItem(STORAGE_KEYS.OTPS);
      if (storedOtps) {
        setOtps(JSON.parse(storedOtps));
      }
    } catch (error) {
      console.error('Failed to load OTPs:', error);
    }
  };

  const saveUsers = async (updatedUsers: User[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
      setUsers(updatedUsers);
    } catch (error) {
      console.error('Failed to save users:', error);
    }
  };

  const saveOtps = async (updatedOtps: OTP[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.OTPS, JSON.stringify(updatedOtps));
      setOtps(updatedOtps);
    } catch (error) {
      console.error('Failed to save OTPs:', error);
    }
  };

  const register = async (
    name: string,
    phone: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; userId?: string; error?: string }> => {
    try {
      const storedUsers = await AsyncStorage.getItem(STORAGE_KEYS.USERS);
      const currentUsers = storedUsers ? JSON.parse(storedUsers) : [];
      
      const existingUser = currentUsers.find((u: User) => u.email === email || u.phone === phone);
      if (existingUser) {
        return { success: false, error: 'User already exists with this email or phone' };
      }

      const newUser: User = {
        id: `user-${Date.now()}`,
        name,
        phone,
        email,
        password: hashPassword(password),
        isAdmin: false,
        role: 'user',
        createdAt: new Date().toISOString(),
      };

      const updatedUsers = [...currentUsers, newUser];
      await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
      setUsers(updatedUsers);
      console.log('User registered successfully:', email);
      return { success: true, userId: newUser.id };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Registration failed' };
    }
  };

  const generateOTP = async (userId: string): Promise<{ success: boolean; otp?: string; error?: string }> => {
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const newOtp: OTP = {
        userId,
        code,
        expiresAt,
        verified: false,
      };

      const filteredOtps = otps.filter(o => o.userId !== userId);
      await saveOtps([...filteredOtps, newOtp]);

      console.log(`OTP for user ${userId}: ${code}`);
      return { success: true, otp: code };
    } catch (error) {
      console.error('Failed to generate OTP:', error);
      return { success: false, error: 'Failed to generate OTP' };
    }
  };

  const verifyOTP = async (userId: string, code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const otp = otps.find(o => o.userId === userId && o.code === code);

      if (!otp) {
        return { success: false, error: 'Invalid OTP code' };
      }

      if (new Date(otp.expiresAt) < new Date()) {
        return { success: false, error: 'OTP has expired' };
      }

      otp.verified = true;
      await saveOtps([...otps]);

      const foundUser = users.find(u => u.id === userId);
      if (foundUser) {
        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(foundUser));
        setUser(foundUser);
      }

      return { success: true };
    } catch (error) {
      console.error('OTP verification error:', error);
      return { success: false, error: 'Verification failed' };
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; userId?: string; error?: string }> => {
    try {
      const storedUsers = await AsyncStorage.getItem(STORAGE_KEYS.USERS);
      const currentUsers = storedUsers ? JSON.parse(storedUsers) : [];
      console.log('Login attempt for:', email, 'Total users:', currentUsers.length);
      
      const foundUser = currentUsers.find((u: User) => u.email === email);

      if (!foundUser) {
        console.log('User not found:', email);
        return { success: false, error: 'User not found' };
      }

      if (!verifyPassword(password, foundUser.password)) {
        console.log('Invalid password for:', email);
        return { success: false, error: 'Invalid password' };
      }

      console.log('Login successful for:', email);
      return { success: true, userId: foundUser.id };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER);
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

      const existingUser = users.find(u => u.email === email);
      if (existingUser) {
        return { success: false, error: 'User with this email already exists' };
      }

      const tempPassword = Math.random().toString(36).slice(-8);
      const newAdmin: User = {
        id: `admin-${Date.now()}`,
        name: 'Admin Viewer',
        phone: '',
        email,
        password: hashPassword(tempPassword),
        isAdmin: true,
        role: 'admin_viewer',
        invitedBy: user.id,
        createdAt: new Date().toISOString(),
      };

      await saveUsers([...users, newAdmin]);
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
        return { success: false, error: 'Only super admins can create accounts' };
      }

      const existingUser = users.find(u => u.email === email || u.phone === phone);
      if (existingUser) {
        return { success: false, error: 'User with this email or phone already exists' };
      }

      const tempPassword = Math.random().toString(36).slice(-8);
      const newUser: User = {
        id: `${role === 'admin_viewer' ? 'admin' : 'user'}-${Date.now()}`,
        name,
        phone,
        email,
        password: hashPassword(tempPassword),
        isAdmin: role === 'admin_viewer',
        role,
        invitedBy: user.id,
        createdAt: new Date().toISOString(),
      };

      await saveUsers([...users, newUser]);
      console.log(`Created ${role} account: ${email} with temporary password: ${tempPassword}`);
      return { success: true, password: tempPassword };
    } catch (error) {
      console.error('Failed to create account:', error);
      return { success: false, error: 'Failed to create account' };
    }
  };

  const getAllAdmins = (): User[] => {
    return users.filter(u => u.isAdmin && u.role !== 'super_admin');
  };

  const isSuperAdmin = (): boolean => {
    return user?.role === 'super_admin';
  };

  const canApproveLoans = (): boolean => {
    return user?.role === 'super_admin';
  };

  const canUploadPayment = (): boolean => {
    return user?.role === 'super_admin';
  };

  const isAdminViewer = (): boolean => {
    return user?.role === 'admin_viewer';
  };

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
    getAllAdmins,
    isSuperAdmin,
    isAdminViewer,
    canApproveLoans,
    canUploadPayment,
  };
});
