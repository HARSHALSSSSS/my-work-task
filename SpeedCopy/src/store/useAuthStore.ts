import { create } from 'zustand';
import * as authApi from '../api/auth';
import { clearToken, getToken } from '../api/client';

interface AuthState {
  isAuthenticated: boolean;
  hasOnboarded: boolean;
  phone: string;
  userName: string;
  userEmail: string;
  userId: string;
  profileImage: string | null;
  referralCode: string;
  loading: boolean;
  error: string | null;

  setAuthenticated: (v: boolean) => void;
  setOnboarded: (v: boolean) => void;
  setPhone: (phone: string) => void;
  setUserName: (name: string) => void;
  setUserEmail: (email: string) => void;
  setProfileImage: (uri: string | null) => void;

  loginWithEmail: (email: string, password: string) => Promise<boolean>;
  registerWithEmail: (name: string, email: string, password: string, phone?: string) => Promise<boolean>;
  restoreSession: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  hasOnboarded: false,
  phone: '',
  userName: '',
  userEmail: '',
  userId: '',
  profileImage: null,
  referralCode: '',
  loading: false,
  error: null,

  setAuthenticated: (v) => set({ isAuthenticated: v }),
  setOnboarded: (v) => set({ hasOnboarded: v }),
  setPhone: (phone) => set({ phone }),
  setUserName: (name) => set({ userName: name }),
  setUserEmail: (email) => set({ userEmail: email }),
  setProfileImage: (uri) => set({ profileImage: uri }),

  loginWithEmail: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { user } = await authApi.login({ email, password });
      set({
        isAuthenticated: true,
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        phone: user.phone || '',
        profileImage: user.photoURL || null,
        loading: false,
      });
      return true;
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Login failed. Please try again.';
      set({ loading: false, error: msg });
      return false;
    }
  },

  registerWithEmail: async (name, email, password, phone) => {
    set({ loading: true, error: null });
    try {
      const { user } = await authApi.register({ name, email, password, phone });
      set({
        isAuthenticated: true,
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        phone: user.phone || '',
        profileImage: user.photoURL || null,
        loading: false,
      });
      return true;
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Registration failed. Please try again.';
      set({ loading: false, error: msg });
      return false;
    }
  },

  restoreSession: async () => {
    const token = await getToken();
    if (!token) return;
    try {
      const user = await authApi.getMe();
      set({
        isAuthenticated: true,
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        phone: user.phone || '',
        profileImage: user.photoURL || null,
      });
    } catch {
      await clearToken();
    }
  },

  logout: () => {
    clearToken();
    set({
      isAuthenticated: false,
      userId: '',
      userName: '',
      userEmail: '',
      phone: '',
      profileImage: null,
    });
  },
}));
