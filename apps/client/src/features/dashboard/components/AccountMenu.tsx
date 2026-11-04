import React from "react";
import { UserIcon, LogOut, CreditCard, HelpCircle, Bell } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * The avatar menu: who is signed in, recent notifications, and the way to
 * profile settings, subscription, help and sign-out.
 *
 * Lifted out of AppHeader so it is not welded to the presentation editor. The
 * dashboard header renders it, and so does the shell bar above every settings
 * page — one implementation, so the two cannot drift.
 */

export interface AccountMenuProps {
  currentUser: any;
  isProfileMenuOpen: boolean;
  setIsProfileMenuOpen: (open: boolean) => void;
  notifications: any[];
  unreadCount: number;
  getNotificationIcon: (type: string) => React.ReactNode;
  formatTimestamp: (date: Date) => string;
  markNotificationAsRead: (id: string) => void;
  setIsNotificationsModalOpen: (open: boolean) => void;
  handleLogout: () => void;
}

export const AccountMenu: React.FC<AccountMenuProps> = ({
  currentUser,
  isProfileMenuOpen,
  setIsProfileMenuOpen,
  notifications,
  unreadCount,
  getNotificationIcon,
  formatTimestamp,
  markNotificationAsRead,
  setIsNotificationsModalOpen,
  handleLogout,
}) => {
  const userObj = (currentUser as any)?.user || currentUser;
  const getUserInitials = (u: any) => {
    if (!u) return "U";
    if (u.firstName || u.lastName) {
      return `${u.firstName?.[0] || ""}${u.lastName?.[0] || ""}`.toUpperCase();
    }
    if (u.username) return u.username[0].toUpperCase();
    if (u.email) return u.email[0].toUpperCase();
    return "U";
  };
  const getUserDisplayName = (u: any) => {
    if (!u) return "User";
    const fullName = `${u.firstName || ""} ${u.lastName || ""}`.trim();
    if (fullName) return fullName;
    if (u.username) return u.username;
    if (u.email) return u.email.split('@')[0];
    return "User";
  };

  const initials = getUserInitials(userObj);
  const displayName = getUserDisplayName(userObj);
  const displayEmail = userObj?.email || "No email";
  const rawProfilePic = userObj?.profilePicture;

  const getProfilePictureSrc = (pic: string | null | undefined) => {
    if (!pic) return undefined;
    if (pic.startsWith('http') || pic.startsWith('/')) return pic;
    return `/api/user-media-assets/${pic}/file`; // Map legacy DB string IDs directly dynamically.
  };

  const profilePic = getProfilePictureSrc(rawProfilePic);

  return (
      <Popover
        open={isProfileMenuOpen}
        onOpenChange={setIsProfileMenuOpen}>
    <PopoverTrigger asChild>
      <button className="relative">
        <Avatar className="w-8 h-8 hover:ring-2 hover:ring-purple-400 transition-all bg-gray-800">
          {profilePic && (
            <img src={profilePic} alt="Profile" className="object-cover h-full w-full rounded-full" />
          )}
          <AvatarFallback className="bg-purple-300 text-purple-800">
            {initials}
          </AvatarFallback>
        </Avatar>
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
            {unreadCount}
          </Badge>
        )}
      </button>
    </PopoverTrigger>
    <PopoverContent className="w-80 bg-[#1a0f2e] border border-gray-600 shadow-lg">
      <div className="space-y-4">
        {/* Profile Header */}
        <div className="flex items-center space-x-3 pb-3 border-b border-gray-600">
          <Avatar className="w-10 h-10 bg-gray-800">
            {profilePic && (
              <img src={profilePic} alt="Profile" className="object-cover h-full w-full rounded-full" />
            )}
            <AvatarFallback className="bg-purple-300 text-purple-800">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="text-white font-medium">
              {displayName}
            </div>
            <div className="text-gray-400 text-sm">
              {displayEmail}
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-white">Notifications</h4>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Badge
                  variant="secondary"
                  className="text-xs bg-gray-700 text-gray-300">
                  {unreadCount} new
                </Badge>
              )}
              <button
                onClick={() => {
                  setIsNotificationsModalOpen(true);
                  setIsProfileMenuOpen(false);
                }}
                className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
                View All
              </button>
            </div>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {notifications.slice(0, 3).map((notification) => (
              <div
                key={notification.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors duration-200 ${notification.read ? "hover:bg-gray-700 opacity-75" : "hover:bg-gray-700 border-l-2 border-blue-400"} border border-gray-700`}
                onClick={() => {
                  markNotificationAsRead(notification.id);
                  setIsNotificationsModalOpen(true);
                  setIsProfileMenuOpen(false);
                }}>
                <div className="flex items-start space-x-3">
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-white">
                      {notification.title}
                    </div>
                    <div className="text-xs text-gray-400 truncate mt-1">
                      {notification.message}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatTimestamp(notification.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {notifications.length === 0 && (
              <div className="text-sm text-gray-500 py-3 text-center">
                No notifications
              </div>
            )}
          </div>
        </div>

        <Separator className="bg-gray-600" />

        {/* Menu Items */}
        <div className="space-y-1">
          {/* Both were dialogs, then tabs of one page. They are now separate
              routes — the account hub, and billing with its own tabs. */}
          <button
            onClick={() => {
              window.location.href = "/dashboard-profile";
              setIsProfileMenuOpen(false);
            }}
            className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-700 rounded-lg transition-colors text-white">
            <UserIcon className="h-4 w-4" />
            <span className="text-sm">Profile Settings</span>
          </button>
          <button
            onClick={() => {
              window.location.href = "/dashboard-subscription";
              setIsProfileMenuOpen(false);
            }}
            className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-700 rounded-lg transition-colors text-white">
            <CreditCard className="h-4 w-4" />
            <span className="text-sm">Subscription</span>
          </button>
          <button
            onClick={() => {
              window.location.href = "/dashboard-help";
              setIsProfileMenuOpen(false);
            }}
            className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-700 rounded-lg transition-colors text-white">
            <HelpCircle className="h-4 w-4" />
            <span className="text-sm">Help &amp; Support</span>
          </button>
        </div>

        <Separator className="bg-gray-600" />

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-red-600/20 rounded-lg transition-colors text-red-400">
          <LogOut className="h-4 w-4" />
          <span className="text-sm">Sign Out</span>
        </button>
      </div>
    </PopoverContent>
    </Popover>
  );
};
