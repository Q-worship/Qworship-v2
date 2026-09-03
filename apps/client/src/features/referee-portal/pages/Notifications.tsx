/** Quiet Momentum notifications: real referral/financial events with visible read state and direct next actions. */
import { Button } from "@/components/ui/button";
import { BellRing, Building2, Check, CircleDollarSign, FileText, Loader2, ShieldCheck, WalletCards } from "lucide-react";
import { useNotifications, type NotificationItem } from "@/hooks/useNotifications";

function iconFor(type: string): { Icon: typeof Building2; color: "violet" | "pink" | "green" | "amber" } {
  switch (type) {
    case "referral_new_organization":
    case "referral_org_activated":
      return { Icon: Building2, color: "violet" };
    case "referral_commission_earned":
      return { Icon: CircleDollarSign, color: "pink" };
    case "referral_withdrawal_paid":
      return { Icon: WalletCards, color: "green" };
    case "password_change":
      return { Icon: ShieldCheck, color: "violet" };
    default:
      return { Icon: FileText, color: "amber" };
  }
}

function NotificationRow({
  item,
  onRead,
  formatTimestamp,
}: {
  item: NotificationItem;
  onRead: (id: string) => void;
  formatTimestamp: (date: string) => string;
}) {
  const { Icon, color } = iconFor(item.type);
  return (
    <button
      onClick={() => !item.isRead && onRead(item._id)}
      className={`flex w-full gap-4 border-b border-[#f0edf5] px-6 py-5 text-left transition last:border-0 hover:bg-[#fbfaff] ${item.isRead ? "bg-white" : "bg-[#faf8ff]"}`}
    >
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
          color === "pink"
            ? "bg-pink-50 text-[#ff2e91]"
            : color === "green"
              ? "bg-emerald-50 text-emerald-600"
              : color === "amber"
                ? "bg-amber-50 text-amber-600"
                : "bg-violet-50 text-[#8054F6]"
        }`}
      >
        <Icon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">{item.title}</span>
          {!item.isRead && <i className="h-2 w-2 rounded-full bg-[#ff2e91]" />}
        </div>
        <p className="mt-1 text-xs leading-5 text-[#7e7885]">{item.message}</p>
      </div>
      <span className="shrink-0 text-[10px] font-semibold text-[#aaa4b0]">{formatTimestamp(item.createdAt)}</span>
    </button>
  );
}

export default function Notifications() {
  const { notifications, unreadCount, isLoading, markNotificationAsRead, markAllAsRead, formatTimestamp } = useNotifications();

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold tracking-[.15em] text-[#8054F6] uppercase">Notifications</p>
          <h1 className="mt-2 text-[34px] font-extrabold">Updates that need your attention.</h1>
          <p className="mt-2 text-sm text-[#77727f]">Referral milestones, money movement, and account security events.</p>
        </div>
        <Button variant="outline" className="h-11 rounded-xl bg-white" onClick={markAllAsRead} disabled={unreadCount === 0}>
          <Check className="mr-2" size={17} />
          Mark all read
        </Button>
      </div>

      <section className="surface mt-7 overflow-hidden rounded-[24px]">
        <div className="flex items-center justify-between border-b border-[#efecf5] px-6 py-5">
          <div>
            <h2 className="text-xl font-extrabold">All updates</h2>
            <p className="mt-1 text-xs text-[#8a8491]">{unreadCount} unread notifications</p>
          </div>
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eee9ff] text-[#8054F6]">
            <BellRing size={19} />
          </span>
        </div>
        <div>
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-[#8a8491]">
              <Loader2 className="animate-spin" size={16} />
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
              <BellRing className="text-[#c9c3d4]" size={28} />
              <p className="text-sm font-semibold text-[#4a4553]">You're all caught up</p>
              <p className="text-xs text-[#8a8491]">New referrals, commissions, and payouts will show up here.</p>
            </div>
          ) : (
            notifications.map((item) => (
              <NotificationRow key={item._id} item={item} onRead={markNotificationAsRead} formatTimestamp={formatTimestamp} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
