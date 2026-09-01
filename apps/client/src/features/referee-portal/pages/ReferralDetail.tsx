/** Quiet Momentum church detail: real referral + commission data for a single referred church. */
import { useQuery } from "@tanstack/react-query";
import StatusPill from "../components/StatusPill";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, CalendarDays, CircleDollarSign, Link2, Loader2, MapPin, ShieldCheck } from "lucide-react";
import { Link, useParams } from "wouter";

interface ReferredChurch {
  id: string;
  church: string;
  city: string;
  country: string;
  plan: string;
  status: string;
  date: string;
}

interface LedgerEntry {
  organizationId: string;
  period: string;
  commissionAmount: number;
  status: "available" | "paid";
}

interface EarningsData {
  currentPeriod: string;
  ledger: LedgerEntry[];
}

export default function ReferralDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: churchesData, isLoading: churchesLoading } = useQuery<{ success: boolean; churches: ReferredChurch[] }>({
    queryKey: ["/api/referrals/my-organizations"],
  });
  const { data: earnings } = useQuery<EarningsData>({ queryKey: ["/api/referrals/my-earnings"] });
  const church = churchesData?.churches.find(c => c.id === id);

  if (churchesLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-[#8054F6]" size={24}/></div>;
  }

  if (!church) {
    return <div>
      <Link href="/referrals" className="inline-flex items-center gap-2 text-sm font-bold text-[#77717f] transition hover:text-[#8054F6]"><ArrowLeft size={16} />Back to referrals</Link>
      <p className="mt-6 text-sm text-[#7a7582]">This church couldn't be found among your referrals.</p>
    </div>;
  }

  const currentCommission = earnings?.ledger.find(row => row.organizationId === church.id && row.period === earnings.currentPeriod);

  return <div>
    <Link href="/referrals" className="inline-flex items-center gap-2 text-sm font-bold text-[#77717f] transition hover:text-[#8054F6]"><ArrowLeft size={16} />Back to referrals</Link>
    <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div className="flex items-start gap-4"><span className="grid h-14 w-14 shrink-0 place-items-center rounded-[18px] bg-[#8054F6] font-[Manrope] text-base font-extrabold text-white">{church.church.split(" ").slice(0,2).map(w => w[0]).join("")}</span><div><div className="flex flex-wrap items-center gap-3"><h1 className="text-[30px] font-extrabold sm:text-[36px]">{church.church}</h1><StatusPill label={church.status} /></div><p className="mt-2 flex items-center gap-1.5 text-sm text-[#7a7582]"><MapPin size={14} />{church.city}{church.city && church.country ? ", " : ""}{church.country} · Introduced {new Date(church.date).toLocaleDateString()}</p></div></div></div>

    <section className="mt-7 grid gap-5 xl:grid-cols-[1fr_.72fr]">
      <article className="surface rounded-[24px] p-6"><p className="text-xs font-bold tracking-[.12em] text-[#8d8997] uppercase">Q-Worship handoff</p><h2 className="mt-2 text-xl font-extrabold">What the team manages</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{["Product demonstration and trial support", "Subscription, billing, and customer success", "Eligibility and duplicate verification", "Secure handling of church account data"].map(item => <div className="flex gap-2 rounded-xl bg-[#faf9fd] p-3 text-xs font-semibold text-[#5e5965]" key={item}><ShieldCheck className="shrink-0 text-emerald-600" size={16}/>{item}</div>)}</div><p className="mt-5 rounded-xl bg-[#f7f5ff] p-3 text-xs leading-5 text-[#6f6978]">Contact details and billing conversations are handled directly by Q-Worship — the referrer view only shows partner-safe milestones.</p></article>
      <aside className="space-y-5"><article className="surface rounded-[24px] p-6"><p className="text-xs font-bold tracking-[.12em] text-[#8d8997] uppercase">Referral summary</p><div className="mt-5 space-y-4">
        <div className="flex items-start gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f2eeff] text-[#8054F6]"><Building2 size={17}/></span><div><div className="text-[10px] font-bold tracking-[.08em] text-[#96909d] uppercase">Plan</div><div className="mt-1 text-sm font-bold capitalize">{church.plan}</div></div></div>
        <div className="flex items-start gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f2eeff] text-[#8054F6]"><Link2 size={17}/></span><div><div className="text-[10px] font-bold tracking-[.08em] text-[#96909d] uppercase">Status</div><div className="mt-1 text-sm font-bold capitalize">{church.status}</div></div></div>
        <div className="flex items-start gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f2eeff] text-[#8054F6]"><CircleDollarSign size={17}/></span><div><div className="text-[10px] font-bold tracking-[.08em] text-[#96909d] uppercase">Current monthly commission</div><div className="mt-1 text-sm font-bold">{currentCommission ? `$${currentCommission.commissionAmount.toFixed(2)}` : "Not active"}</div></div></div>
        <div className="flex items-start gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f2eeff] text-[#8054F6]"><CalendarDays size={17}/></span><div><div className="text-[10px] font-bold tracking-[.08em] text-[#96909d] uppercase">Introduced</div><div className="mt-1 text-sm font-bold">{new Date(church.date).toLocaleDateString()}</div></div></div>
      </div></article>
      <Button asChild variant="outline" className="w-full rounded-xl bg-white"><Link href="/earnings">View full commission ledger</Link></Button>
      </aside>
    </section>
  </div>;
}
