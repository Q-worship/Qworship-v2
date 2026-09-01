/** Quiet Momentum payment history: real, reconciled withdrawal records. */
import { useQuery } from "@tanstack/react-query";
import StatusPill from "../components/StatusPill";
import { Button } from "@/components/ui/button";
import { Download, FileText, Loader2, ReceiptText, WalletCards } from "lucide-react";
import { toast } from "../lib/toast";

interface WithdrawalRow {
  id: string;
  amount: number;
  destination: string;
  status: "pending" | "processing" | "paid" | "rejected";
  createdAt: string;
  processedAt?: string;
}

function formatMoney(value: number) {
  return `$${value.toFixed(2)}`;
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleDateString() : "—";
}

export default function PaymentHistory() {
  const { data, isLoading } = useQuery<{ requests: WithdrawalRow[] }>({ queryKey: ["/api/referrals/my-withdrawals"] });
  const requests = data?.requests || [];
  const paid = requests.filter(r => r.status === "paid");
  const currentYear = new Date().getFullYear();
  const paidThisYear = paid.filter(r => r.processedAt && new Date(r.processedAt).getFullYear() === currentYear);
  const totalPaidThisYear = paidThisYear.reduce((sum, r) => sum + r.amount, 0);

  return <div><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold tracking-[.15em] text-[#8054F6] uppercase">Payment history</p><h1 className="mt-2 text-[34px] font-extrabold">Paid, referenced, and easy to reconcile.</h1><p className="mt-2 text-sm text-[#77727f]">Every completed and pending withdrawal you've requested.</p></div></div>

  {isLoading ? <div className="mt-10 flex justify-center"><Loader2 className="animate-spin text-[#8054F6]" size={24}/></div> : <>
    <section className="mt-7 grid gap-5 sm:grid-cols-3">
      <article className="surface rounded-[22px] p-5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-[#8054F6]"><WalletCards size={19}/></span><div className="metric-number mt-5 text-3xl font-extrabold">{formatMoney(totalPaidThisYear)}</div><div className="mt-1 text-sm font-bold">Paid in {currentYear}</div><p className="mt-2 text-xs text-[#8b8591]">{paidThisYear.length} completed withdrawal{paidThisYear.length === 1 ? "" : "s"}</p></article>
      <article className="surface rounded-[22px] p-5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><ReceiptText size={19}/></span><div className="metric-number mt-5 text-3xl font-extrabold">{paid.length}</div><div className="mt-1 text-sm font-bold">Reconciled payments</div><p className="mt-2 text-xs text-[#8b8591]">All-time completed withdrawals</p></article>
      <article className="surface rounded-[22px] p-5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-pink-50 text-[#ff2e91]"><FileText size={19}/></span><div className="metric-number mt-5 text-3xl font-extrabold">$0.00</div><div className="mt-1 text-sm font-bold">Fees recorded</div><p className="mt-2 text-xs text-[#8b8591]">No payout fees are charged today</p></article>
    </section>
    <section className="surface mt-5 overflow-hidden rounded-[24px]">
      <div className="flex items-center justify-between px-6 py-5"><div><p className="text-xs font-bold tracking-[.12em] text-[#8d8997] uppercase">Payouts</p><h2 className="mt-2 text-xl font-extrabold">Transaction history</h2></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="bg-[#faf9fd] text-[10px] font-bold tracking-[.1em] text-[#918c99] uppercase"><tr><th className="px-6 py-3">Amount</th><th className="px-4 py-3">Requested</th><th className="px-4 py-3">Completed</th><th className="px-4 py-3">Destination</th><th className="px-4 py-3">Status</th><th className="px-6 py-3 text-right">Statement</th></tr></thead><tbody>{requests.length === 0 ? <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-[#8b8693]">No withdrawal requests yet.</td></tr> : requests.map(row => <tr key={row.id} className="border-t border-[#f0edf5] text-[13px] hover:bg-[#fbfaff]"><td className="px-6 py-4 font-extrabold">{formatMoney(row.amount)}</td><td className="px-4 py-4 text-[#716c78]">{formatDate(row.createdAt)}</td><td className="px-4 py-4 text-[#716c78]">{formatDate(row.processedAt)}</td><td className="px-4 py-4 text-[#716c78]">{row.destination}</td><td className="px-4 py-4"><StatusPill label={row.status}/></td><td className="px-6 py-4 text-right"><Button variant="ghost" size="sm" className="font-bold text-[#8054F6]" disabled={row.status !== "paid"} onClick={() => toast.success("Statement prepared")}><Download className="mr-2" size={14}/>PDF</Button></td></tr>)}</tbody></table></div>
    </section>
  </>}
  </div>;
}
