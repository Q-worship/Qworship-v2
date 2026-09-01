/** Quiet Momentum dashboard: progress-first hierarchy with one clear share action and transparent money states. */
import MetricCard from "../components/MetricCard";
import StatusPill from "../components/StatusPill";
import { activities } from "../data/mockData";
import { getReferralCode, getReferralLink } from "../lib/referralCode";
import { Button } from "@/components/ui/button";
import { ArrowRight, Building2, Check, CircleDollarSign, Clock3, Copy, Link2, Loader2, MousePointerClick, QrCode, Sparkles, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "../lib/toast";
import { Link } from "wouter";
import MomentumArtwork from "../components/MomentumArtwork";
import { useAuthStore } from "@/features/auth/auth.store";

interface ReferredChurch {
  id: string;
  church: string;
  city: string;
  country: string;
  plan: string;
  status: string;
  date: string;
}

interface EarningsData {
  withdrawableBalance: number;
  estimatedThisMonth: number;
  earningsTrend: { period: string; earned: number }[];
}

function formatMoney(value: number) {
  return `$${value.toFixed(2)}`;
}

const journey = [{ label: "Visited", value: 246, color: "bg-[#e8e1ff] text-[#6f49d8]" }, { label: "Interested", value: 58, color: "bg-[#ddd1ff] text-[#6540cf]" }, { label: "In trial", value: 31, color: "bg-[#c7b4ff] text-[#5933c6]" }, { label: "Paying", value: 18, color: "bg-[#8054F6] text-white" }];

export default function Dashboard() {
  const [copied, setCopied] = useState(false);
  const user = useAuthStore((state) => state.user);
  const referralCode = useMemo(() => getReferralCode(user), [user]);
  const referralLink = useMemo(() => getReferralLink(referralCode), [referralCode]);
  const { data: churchesData, isLoading: churchesLoading } = useQuery<{ success: boolean; churches: ReferredChurch[] }>({
    queryKey: ["/api/referrals/my-organizations"],
  });
  const churches = churchesData?.churches || [];
  const activePaidChurches = churches.filter((c) => c.status === "active").length;
  const trialsInProgress = churches.filter((c) => c.status === "trial").length;
  const { data: earnings } = useQuery<EarningsData>({ queryKey: ["/api/referrals/my-earnings"] });
  async function copyLink() { await navigator.clipboard.writeText(referralLink); setCopied(true); toast.success("Referral link copied"); window.setTimeout(() => setCopied(false), 1700); }
  return <div>
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold tracking-[.15em] text-[#8054F6] uppercase">Wednesday, 26 August</p><h1 className="mt-2 text-[32px] font-extrabold sm:text-[38px]">Your referrals are moving forward.</h1><p className="mt-2 max-w-2xl text-sm text-[#75717f]">See what changed, help the next church begin, and keep a clear view of what you can withdraw.</p></div><Button asChild className="violet-button h-11 rounded-xl px-5 font-bold"><Link href="/referrals">View all churches <ArrowRight className="ml-2" size={17} /></Link></Button></div>

    <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Available to withdraw" value={formatMoney(earnings?.withdrawableBalance ?? 0)} note="Cleared commission only" icon={WalletCards} />
      <MetricCard label="Earned this month" value={formatMoney(earnings?.estimatedThisMonth ?? 0)} note="From active paid churches" icon={CircleDollarSign} accent="pink" />
      <MetricCard label="Active paid churches" value={String(activePaidChurches)} note="Generating recurring income" icon={Building2} accent="green" />
      <MetricCard label="Trials in progress" value={String(trialsInProgress)} note="Potential future commission" icon={Clock3} accent="amber" />
    </section>

    <section className="mt-5 grid gap-5 xl:grid-cols-[1.22fr_.78fr]">
      <article className="relative overflow-hidden rounded-[24px] bg-[#27232f] p-6 text-white shadow-[0_22px_55px_rgba(38,31,57,.18)] sm:p-7">
        <MomentumArtwork dark variant="share" className="hidden md:block" /><div className="absolute inset-y-0 right-[38%] hidden w-40 bg-gradient-to-r from-[#27232f] to-transparent md:block" />
        <div className="relative z-10 max-w-[58%] min-w-[280px]"><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-[#eee9ff]"><Sparkles size={13} /> Your referral link</span><h2 className="mt-5 text-[25px] font-extrabold leading-tight">Share Q-Worship with the next church.</h2><p className="mt-2 text-sm leading-6 text-[#c9c4d2]">Every eligible sign-up through your link or code is attributed to your account.</p><div className="mt-5 flex items-center rounded-xl bg-white/9 p-1.5 ring-1 ring-white/10"><code className="min-w-0 flex-1 truncate px-2 text-xs text-[#f1eef7]">{referralLink}</code><button onClick={copyLink} className="grid h-9 w-10 shrink-0 place-items-center rounded-lg bg-white text-[#2b2633] transition hover:bg-[#eee9ff]" aria-label="Copy referral link">{copied ? <Check size={17} className="text-emerald-600" /> : <Copy size={17} />}</button></div><div className="mt-4 flex items-center gap-3 text-xs text-[#bdb6c9]"><span className="rounded-md border border-white/10 px-2 py-1 font-mono text-white">{referralCode}</span><button onClick={() => toast.info("A downloadable QR code would be generated for this referral link.")} className="flex items-center gap-1.5 font-semibold text-[#d8ceff] hover:text-white"><QrCode size={15} />Get QR code</button></div></div>
      </article>

      <article className="surface rounded-[24px] p-6"><div className="flex items-start justify-between"><div><p className="text-xs font-bold tracking-[.12em] text-[#8d8997] uppercase">Client journey</p><h2 className="mt-2 text-xl font-extrabold">From interest to income</h2></div><Link href="/analytics" className="text-xs font-bold text-[#8054F6] hover:underline">Full funnel</Link></div><div className="mt-6 space-y-3">{journey.map((step, index) => <div key={step.label}><div className="mb-1.5 flex items-center justify-between text-xs"><span className="font-semibold text-[#56525f]">{step.label}</span><span className="font-bold">{step.value}</span></div><div className="h-2.5 overflow-hidden rounded-full bg-[#f0edf7]"><div className={`h-full rounded-full ${step.color.split(" ")[0]}`} style={{ width: `${100 - index * 18}%` }} /></div></div>)}</div><p className="mt-5 rounded-xl bg-[#f7f5ff] p-3 text-xs leading-5 text-[#6f6978]">The portal shows partner-safe milestones. Q-Worship manages sales conversations and church onboarding.</p></article>
    </section>

    <section className="mt-5 grid gap-5 xl:grid-cols-[1.22fr_.78fr]">
      <article className="surface rounded-[24px] p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold tracking-[.12em] text-[#8d8997] uppercase">Recurring earnings</p><h2 className="mt-2 text-xl font-extrabold">Six-month movement</h2></div><div className="text-right"><div className="metric-number text-lg font-extrabold text-[#8054F6]">{formatMoney(earnings?.estimatedThisMonth ?? 0)}</div><div className="text-[10px] text-[#8c8795]">This month</div></div></div><div className="mt-4 h-[230px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={earnings?.earningsTrend ?? []} margin={{ left: -22, right: 6, top: 10, bottom: 0 }}><defs><linearGradient id="earningsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8054F6" stopOpacity={0.24}/><stop offset="100%" stopColor="#8054F6" stopOpacity={0.02}/></linearGradient></defs><CartesianGrid stroke="#eeeaf6" vertical={false} /><XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fill: "#8a8692", fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#aaa6b1", fontSize: 10 }} /><Tooltip contentStyle={{ border: 0, borderRadius: 12, boxShadow: "0 12px 30px rgba(39,31,63,.12)", fontSize: 12 }} formatter={(value) => [`$${value}`, "Earned"]} /><Area type="monotone" dataKey="earned" stroke="#8054F6" strokeWidth={3} fill="url(#earningsFill)" /></AreaChart></ResponsiveContainer></div></article>
      <article className="surface rounded-[24px] p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold tracking-[.12em] text-[#8d8997] uppercase">Latest activity</p><h2 className="mt-2 text-xl font-extrabold">What changed</h2></div><Link href="/notifications" className="text-xs font-bold text-[#8054F6] hover:underline">All updates</Link></div><div className="mt-5 space-y-1">{activities.map((item, index) => <div key={item.title} className="flex gap-3 border-b border-[#f0edf5] py-3 last:border-0"><span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${item.tone === "pink" ? "bg-[#ff2e91]" : item.tone === "green" ? "bg-emerald-500" : "bg-[#8054F6]"}`} /><div className="min-w-0 flex-1"><div className="text-[13px] font-bold text-[#312e36]">{item.title}</div><div className="mt-1 text-[11px] text-[#888391]">{item.detail}</div></div><span className="text-[10px] text-[#aaa5b1]">{item.time}</span></div>)}</div></article>
    </section>

    <section className="surface mt-5 overflow-hidden rounded-[24px]"><div className="flex items-center justify-between px-5 py-5 sm:px-6"><div><p className="text-xs font-bold tracking-[.12em] text-[#8d8997] uppercase">Churches to watch</p><h2 className="mt-2 text-xl font-extrabold">Latest churches you referred</h2></div><Button asChild variant="outline" className="rounded-xl bg-white"><Link href="/referrals">View all <ArrowRight className="ml-2" size={15} /></Link></Button></div><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left"><thead className="bg-[#faf9fd] text-[10px] font-bold tracking-[.1em] text-[#918c99] uppercase"><tr><th className="px-6 py-3">Church</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Plan</th><th className="px-6 py-3">Introduced</th></tr></thead><tbody>{churchesLoading ? <tr><td colSpan={4} className="px-6 py-12 text-center"><Loader2 className="mx-auto animate-spin text-[#8054F6]" size={22}/></td></tr> : churches.length === 0 ? <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-[#8b8693]">No churches have signed up with your referral code yet.</td></tr> : churches.slice(0, 5).map(church => <tr key={church.id} className="border-t border-[#f0edf5] text-[13px] transition hover:bg-[#fbfaff]"><td className="px-6 py-4"><div className="font-bold text-[#302d35]">{church.church}</div><div className="mt-1 text-[11px] text-[#95909d]">{church.city}{church.city && church.country ? ", " : ""}{church.country}</div></td><td className="px-4 py-4"><StatusPill label={church.status} /></td><td className="px-4 py-4 font-semibold capitalize text-[#625e69]">{church.plan}</td><td className="px-6 py-4 text-[#77727f]">{new Date(church.date).toLocaleDateString()}</td></tr>)}</tbody></table></div></section>
  </div>;
}
