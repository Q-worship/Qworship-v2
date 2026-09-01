/** Quiet Momentum earnings: real commission ledger driven by which referred churches are active, paying customers. */
import { useQuery } from "@tanstack/react-query";
import MetricCard from "../components/MetricCard";
import StatusPill from "../components/StatusPill";
import { Button } from "@/components/ui/button";
import { ArrowRight, CircleDollarSign, Hourglass, Info, Loader2, RefreshCcw, WalletCards } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Link } from "wouter";

interface LedgerEntry {
  id: string;
  church: string;
  period: string;
  grossAmount: number;
  commissionAmount: number;
  status: "available" | "paid";
  createdAt: string;
}

interface EarningsData {
  success: boolean;
  availableBalance: number;
  withdrawableBalance: number;
  totalPaid: number;
  totalEarnedAllTime: number;
  estimatedThisMonth: number;
  currentPeriod: string;
  earningsTrend: { period: string; earned: number }[];
  ledger: LedgerEntry[];
}

function formatMoney(value: number) {
  return `$${value.toFixed(2)}`;
}

export default function Earnings() {
  const { data, isLoading } = useQuery<EarningsData>({ queryKey: ["/api/referrals/my-earnings"] });

  return <div>
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold tracking-[.15em] text-[#8054F6] uppercase">Earnings</p><h1 className="mt-2 text-[34px] font-extrabold">Every commission, explained.</h1><p className="mt-2 max-w-2xl text-sm text-[#77727f]">Commission accrues monthly for every referred church that's active on a paid plan. Only cleared commission appears in your available balance.</p></div><Button asChild className="violet-button h-11 rounded-xl px-5 font-bold"><Link href="/withdrawals">Request withdrawal <ArrowRight className="ml-2" size={17}/></Link></Button></div>

    {isLoading ? <div className="mt-10 flex justify-center"><Loader2 className="animate-spin text-[#8054F6]" size={24}/></div> : <>
      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Estimated this month" value={formatMoney(data?.estimatedThisMonth ?? 0)} note={`For ${data?.currentPeriod ?? "the current period"}`} icon={RefreshCcw} accent="amber"/>
        <MetricCard label="Available" value={formatMoney(data?.withdrawableBalance ?? 0)} note="Ready to request" icon={WalletCards}/>
        <MetricCard label="Paid all-time" value={formatMoney(data?.totalPaid ?? 0)} note="Across completed payouts" icon={CircleDollarSign} accent="green"/>
        <MetricCard label="Earned all-time" value={formatMoney(data?.totalEarnedAllTime ?? 0)} note="Available plus paid" icon={Hourglass} accent="pink"/>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.18fr_.82fr]">
        <article className="surface rounded-[24px] p-6">
          <p className="text-xs font-bold tracking-[.12em] text-[#8d8997] uppercase">Recurring earnings</p>
          <h2 className="mt-2 text-xl font-extrabold">Last six months</h2>
          <div className="mt-5 h-[265px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data?.earningsTrend ?? []} margin={{ left: -20, top: 10, right: 4 }}><defs><linearGradient id="earned" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8054F6" stopOpacity={.25}/><stop offset="1" stopColor="#8054F6" stopOpacity={.01}/></linearGradient></defs><CartesianGrid stroke="#eeeaf6" vertical={false}/><XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fill: "#8a8692", fontSize: 11 }}/><YAxis axisLine={false} tickLine={false} tick={{ fill: "#aaa6b1", fontSize: 10 }}/><Tooltip contentStyle={{ border: 0, borderRadius: 12, boxShadow: "0 12px 30px rgba(39,31,63,.12)", fontSize: 12 }} formatter={(v) => `$${Number(v).toFixed(2)}`}/><Area type="monotone" dataKey="earned" stroke="#8054F6" strokeWidth={3} fill="url(#earned)"/></AreaChart></ResponsiveContainer></div>
        </article>
        <article className="surface rounded-[24px] p-6">
          <p className="text-xs font-bold tracking-[.12em] text-[#8d8997] uppercase">How commission becomes available</p>
          <h2 className="mt-2 text-xl font-extrabold">A transparent clearing path</h2>
          <div className="mt-6 space-y-5">{[["1","Church goes active","Q-worship marks the referred church active on a paid plan."],["2","Commission accrues monthly","Each active month adds a flat 30% of that church's plan price to your ledger."],["3","Balance becomes available","Accrued commission is immediately available to withdraw."],["4","Payout is reconciled","Once paid, a ledger entry and payout record appear in history."]].map(([n,t,d],i) => <div className="flex gap-3" key={n}><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-extrabold ${i===2 ? "bg-[#8054F6] text-white" : "bg-[#f0ecf8] text-[#7654cf]"}`}>{n}</span><div><div className="text-sm font-bold">{t}</div><p className="mt-1 text-xs leading-5 text-[#827d89]">{d}</p></div></div>)}</div>
          <div className="mt-5 flex gap-2 rounded-xl bg-[#f7f5ff] p-3 text-xs leading-5 text-[#6f687a]"><Info className="mt-0.5 shrink-0 text-[#8054F6]" size={15}/>Recurring commission continues every month the referred church stays active on a paid plan.</div>
        </article>
      </section>

      <section className="surface mt-5 overflow-hidden rounded-[24px]">
        <div className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold tracking-[.12em] text-[#8d8997] uppercase">Commission ledger</p><h2 className="mt-2 text-xl font-extrabold">Recent entries</h2></div><span className="text-xs text-[#918b98]">Amounts shown in USD · Flat 30% commission rate</span></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left"><thead className="bg-[#faf9fd] text-[10px] font-bold tracking-[.1em] text-[#918c99] uppercase"><tr><th className="px-6 py-3">Church</th><th className="px-4 py-3">Period</th><th className="px-4 py-3">Gross</th><th className="px-4 py-3">Commission</th><th className="px-6 py-3">Status</th></tr></thead><tbody>{!data?.ledger?.length ? <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-[#8b8693]">No commission has accrued yet — it starts once a referred church is active on a paid plan.</td></tr> : data.ledger.map(row => <tr key={row.id} className="border-t border-[#f0edf5] text-[13px] hover:bg-[#fbfaff]"><td className="px-6 py-4 font-bold">{row.church}</td><td className="px-4 py-4 text-[#716c78]">{row.period}</td><td className="px-4 py-4 font-semibold">{formatMoney(row.grossAmount)}</td><td className="px-4 py-4 font-bold text-[#403a49]">{formatMoney(row.commissionAmount)}</td><td className="px-6 py-4"><StatusPill label={row.status}/></td></tr>)}</tbody></table></div>
      </section>
    </>}
  </div>;
}
