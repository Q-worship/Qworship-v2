import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  user: null | { id: string; username?: string; role?: string; email: string; firstName?: string; lastName?: string; onboardingStatus?: string; trialStatus?: string; trialEndDate?: string; subscriptionStatus?: string; };
  setAuth: (user: AuthState['user']) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  let initialUser = null;
  if (typeof window !== 'undefined') {
    try {
      const storedUser = localStorage.getItem('qworship_user');
      if (storedUser) {
        initialUser = JSON.parse(storedUser);
      }
    } catch (e) {
      console.error('Failed to parse stored user', e);
    }
  }

  return {
    isAuthenticated: typeof window !== 'undefined' ? !!localStorage.getItem('token') : false,
    user: initialUser,
    setAuth: (user) => {
      localStorage.setItem('qworship_user', JSON.stringify(user));
      set({ isAuthenticated: true, user });
    },
    logout: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('qworship_user_id');
      sessionStorage.removeItem('qworship_user_data');
      sessionStorage.removeItem('verifyEmail');
      sessionStorage.removeItem('qworship_current_presentation_id');
      sessionStorage.removeItem('qworship_current_presentation_name');
      sessionStorage.removeItem('qworship_presentation_to_load');
      localStorage.removeItem('qworship_user');
      set({ isAuthenticated: false, user: null });
    },
  };
});
