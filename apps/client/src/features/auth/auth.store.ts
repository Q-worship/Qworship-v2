import { create } from 'zustand';
import { queryClient } from '@/lib/queryClient';

/*
 * WHOEVER SIGNS IN NEXT MUST NOT INHERIT THE LAST PERSON'S ANSWERS.
 *
 * React Query keys here are static — `["/api/billing/capabilities"]` and the
 * rest carry no user id — and the app never reloads between sessions, so a
 * cache left standing belongs to whoever was signed in before. That was
 * survivable while it only mis-rendered a locked button. It is not now that
 * the route guard decides redirects from `capabilities.trialExpired`: on a
 * shared console machine, an owner whose trial had lapsed could sign out, the
 * next person could sign in inside the 5-minute staleTime, and land on the
 * trial-ended screen — where "Continue with the free plan" would post with
 * THEIR token and settle THEIR running trial onto free.
 *
 * Clearing the whole cache rather than the one key, because the same
 * reasoning applies to every per-church read in the app: songs, media,
 * billing, usage.
 */
const forgetEverythingCached = () => {
  try {
    queryClient.clear();
  } catch (error) {
    // Never block a sign-in or sign-out on cache housekeeping.
    console.warn('[auth] Could not clear cached queries', error);
  }
};

interface AuthState {
  isAuthenticated: boolean;
  user: null | { id: string; username?: string; role?: string; email: string; firstName?: string; lastName?: string; phoneNumber?: string; countryCode?: string; referralCode?: string; onboardingStatus?: string; trialStatus?: string; trialEndDate?: string; subscriptionStatus?: string; roleId?: string | null; mustChangePassword?: boolean; permissions?: string[]; };
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
      // A DIFFERENT person signing in, not the periodic refresh of the same
      // one: AuthGuard calls this on every mount with the freshly fetched
      // user, and clearing on that would throw away the cache constantly.
      const previous = useAuthStore.getState().user;
      if (previous && user && previous.id !== user.id) forgetEverythingCached();
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
      forgetEverythingCached();
      set({ isAuthenticated: false, user: null });
    },
  };
});
