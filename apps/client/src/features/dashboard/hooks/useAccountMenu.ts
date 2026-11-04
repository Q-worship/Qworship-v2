import React from "react";
import { AlertTriangle, CheckCircle, Bell } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuthStore } from "@/features/auth/auth.store";
import { useNotifications } from "@/hooks/useNotifications";
import type { AccountMenuProps } from "@/features/dashboard/components/AccountMenu";

/**
 * Everything the avatar menu needs, in one call.
 *
 * The dashboard already assembles these from four places — a user query, the
 * notifications hook, an icon map and a logout mutation. The shell bar above
 * the settings pages needs the same set, and copying four fragments is how the
 * two menus would start to disagree. Returned ready to spread onto AccountMenu.
 *
 * DashboardLayoutV2 still builds its own copy. Moving it onto this hook is
 * worth doing, but it is a change inside a 6,000-line component and not
 * something to bundle with the shell work.
 */

type MenuData = Omit<AccountMenuProps, "isProfileMenuOpen" | "setIsProfileMenuOpen">;

/** Matches the API's notification types; unknown types get a neutral bell. */
function notificationIcon(type: string): React.ReactNode {
  switch (type) {
    case "welcome":
      return React.createElement(CheckCircle, { className: "h-4 w-4 text-green-500" });
    case "password_change":
      return React.createElement(CheckCircle, { className: "h-4 w-4 text-blue-500" });
    case "plan_subscription":
    case "new_plan":
      return React.createElement(CheckCircle, { className: "h-4 w-4 text-purple-500" });
    case "payment_success":
      return React.createElement(CheckCircle, { className: "h-4 w-4 text-green-500" });
    case "plan_expiry_reminder":
      return React.createElement(AlertTriangle, { className: "h-4 w-4 text-yellow-500" });
    case "plan_expired":
      return React.createElement(AlertTriangle, { className: "h-4 w-4 text-red-500" });
    default:
      return React.createElement(Bell, { className: "h-4 w-4 text-gray-400" });
  }
}

export function useAccountMenu(): MenuData {
  const { data: currentUserResponse } = useQuery<{ success: boolean; user: any }>({
    queryKey: ["/api/user/current"],
  });

  const {
    notifications: apiNotifications,
    unreadCount,
    markNotificationAsRead,
    formatTimestamp,
  } = useNotifications();

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/logout"),
    onSettled: () => {
      // Local state goes either way: a failed server logout must not leave the
      // user looking signed in.
      localStorage.removeItem("qworship-saved-songs");
      localStorage.removeItem("handsfreeBibleState");
      useAuthStore.getState().logout();
      window.location.href = "/login";
    },
  });

  const notifications = apiNotifications.map((n: any) => ({
    id: n._id,
    type: n.type,
    title: n.title,
    message: n.message,
    timestamp: n.createdAt,
    read: n.isRead,
  }));

  return {
    currentUser: currentUserResponse?.user || null,
    notifications,
    unreadCount,
    getNotificationIcon: notificationIcon,
    formatTimestamp,
    markNotificationAsRead,
    // The settings pages have no notifications dialog of their own; the menu's
    // "View All" sends them to the dashboard, which does.
    setIsNotificationsModalOpen: () => {
      window.location.href = "/dashboard";
    },
    handleLogout: () => logoutMutation.mutate(),
  };
}
