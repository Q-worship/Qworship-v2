/** Quiet Momentum withdrawal flow: real available balance and persisted requests, calm review states. */
import StatusPill from "../components/StatusPill";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle as CircleAlert, ArrowRight, Banknote, Building2, Check, Loader2, ShieldCheck, WalletCards } from "lucide-react";
import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { toast } from "../lib/toast";
import MomentumArtwork from "../components/MomentumArtwork";
import PayoutMethodManager, { initialPayoutMethods, type PayoutMethod } from "../components/PayoutMethodManager";

const MINIMUM_WITHDRAWAL = 50;

interface EarningsData {
  withdrawableBalance: number;
}

interface WithdrawalRow {
  id: string;
  amount: number;
  destination: string;
  status: "pending" | "processing" | "paid" | "rejected";
  createdAt: string;
}

function formatMoney(value: number) {
  return `$${value.toFixed(2)}`;
}

export default function Withdrawals() {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [amount, setAmount] = useState("");
  const [methodManagerOpen, setMethodManagerOpen] = useState(() => new URLSearchParams(window.location.search).get("managePayout") === "open");
  const [methods, setMethods] = useState<PayoutMethod[]>(initialPayoutMethods);
  const [withdrawalMethodId, setWithdrawalMethodId] = useState("ecobank-8142");
  const defaultMethod = methods.find(method => method.isDefault && method.status === "verified") || methods.find(method => method.status === "verified") || methods[0];
  function updateMethods(next: PayoutMethod[]) { setMethods(next); const nextDefault = next.find(method => method.isDefault && method.status === "verified"); if (nextDefault) setWithdrawalMethodId(nextDefault.id); }

  const { data: earnings, isLoading: earningsLoading } = useQuery<EarningsData>({ queryKey: ["/api/referrals/my-earnings"] });
  const { data: withdrawalsData, isLoading: withdrawalsLoading } = useQuery<{ requests: WithdrawalRow[] }>({ queryKey: ["/api/referrals/my-withdrawals"] });
  const requests = withdrawalsData?.requests || [];
  const currentRequest = requests.find(r => r.status === "pending" || r.status === "processing");
  const availableBalance = earnings?.withdrawableBalance ?? 0;

  const requestMutation = useMutation({
    mutationFn: async () => {
      const selectedMethod = methods.find(m => m.id === withdrawalMethodId);
      const destination = selectedMethod ? `${selectedMethod.provider} · ${selectedMethod.masked}` : "Payout method on file";
      const response = await apiRequest("POST", "/api/referrals/withdrawals", { amount: Number(amount), destination });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referrals/my-earnings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/referrals/my-withdrawals"] });
      setSubmitted(true);
    },
    onError: (error: any) => toast.error(error?.message?.replace(/^\d+:\s*/, "") || "Unable to submit withdrawal request"),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount < MINIMUM_WITHDRAWAL) {
      toast.error(`Enter an amount of at least ${formatMoney(MINIMUM_WITHDRAWAL)}`);
      return;
    }
    if (numericAmount > availableBalance) {
      toast.error("That's more than your available balance");
      return;
    }
    requestMutation.mutate();
  }
  function close() { setOpen(false); window.setTimeout(() => setSubmitted(false), 250); }

  return <div><div><p className="text-xs font-bold tracking-[.15em] text-[#8054F6] uppercase">Withdrawals</p><h1 className="mt-2 text-[34px] font-extrabold">Move available earnings securely.</h1><p className="mt-2 text-sm text-[#77727f]">Review your cleared balance, payout destination, and processing timeline before requesting payment.</p></div>
  <section className="mt-7 grid gap-5 xl:grid-cols-[1.12fr_.88fr]"><article className="relative overflow-hidden rounded-[26px] bg-[#27232f] p-7 text-white shadow-[0_24px_60px_rgba(39,31,57,.2)]"><MomentumArtwork dark variant="payout"/><div className="relative max-w-[66%]"><p className="text-xs font-bold tracking-[.12em] text-[#cfc5ec] uppercase">Available now</p><div className="metric-number mt-3 text-5xl font-extrabold">{earningsLoading ? <Loader2 className="animate-spin" size={32}/> : formatMoney(availableBalance)}</div><p className="mt-2 text-sm text-[#c7c1ce]">Minimum request: {formatMoney(MINIMUM_WITHDRAWAL)}</p><div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-[#ff2e91] to-[#8054F6]" style={{ width: `${Math.min(100, (availableBalance / Math.max(MINIMUM_WITHDRAWAL, availableBalance)) * 100)}%` }}/></div><p className="mt-2 text-xs text-[#a9a1b2]">{availableBalance >= MINIMUM_WITHDRAWAL ? "You have met the withdrawal threshold." : "Keep earning to reach the minimum withdrawal amount."}</p><Button className="mt-6 h-11 rounded-xl bg-white px-5 font-extrabold text-[#2b2633] hover:bg-[#eee9ff]" disabled={availableBalance < MINIMUM_WITHDRAWAL || !!currentRequest} onClick={() => { setAmount(availableBalance.toFixed(2)); setOpen(true); }}>Request withdrawal <ArrowRight className="ml-2" size={17}/></Button></div></article>
  <article className="surface rounded-[26px] p-6"><div className="flex items-start justify-between"><div><p className="text-xs font-bold tracking-[.12em] text-[#8d8997] uppercase">Payout destination</p><h2 className="mt-2 text-xl font-extrabold">Verified {defaultMethod?.type === "mobile" ? "mobile wallet" : "bank account"}</h2></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><ShieldCheck size={20}/></span></div><div className="mt-6 flex items-center gap-3 rounded-xl bg-[#f8f7fb] p-4"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-[#8054F6] shadow-sm">{defaultMethod?.type === "mobile" ? <WalletCards size={20}/> : <Building2 size={20}/>}</span><div><div className="text-sm font-bold">{defaultMethod?.provider} · {defaultMethod?.masked}</div><div className="mt-1 text-xs text-[#85808c]">{defaultMethod?.holder} · {defaultMethod?.currency} destination</div></div></div><div className="mt-5 grid grid-cols-2 gap-3 text-xs"><div className="rounded-xl border border-[#eeebf5] p-3"><div className="text-[#918b98]">Processing</div><div className="mt-1 font-bold">{defaultMethod?.processing}</div></div><div className="rounded-xl border border-[#eeebf5] p-3"><div className="text-[#918b98]">Payout fee</div><div className="mt-1 font-bold">{defaultMethod?.fee}</div></div></div><Button variant="outline" className="mt-5 w-full rounded-xl bg-white" onClick={() => setMethodManagerOpen(true)}>Manage payout method</Button></article></section>
  <section className="mt-5 grid gap-5 xl:grid-cols-[1.12fr_.88fr]"><article className="surface rounded-[24px] p-6"><p className="text-xs font-bold tracking-[.12em] text-[#8d8997] uppercase">Current request</p><h2 className="mt-2 text-xl font-extrabold">{withdrawalsLoading ? "Loading…" : currentRequest ? "A request is in progress" : "Nothing is processing"}</h2>{withdrawalsLoading ? <div className="mt-6 flex justify-center py-10"><Loader2 className="animate-spin text-[#8054F6]" size={22}/></div> : currentRequest ? <div className="mt-6 flex items-center gap-4 rounded-[18px] border border-[#eeebf5] bg-[#fbfaff] px-5 py-6"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#f0ecff] text-[#8054F6]"><WalletCards size={22}/></span><div className="flex-1"><div className="flex items-center gap-2"><span className="text-lg font-bold">{formatMoney(currentRequest.amount)}</span><StatusPill label={currentRequest.status}/></div><p className="mt-1 text-xs text-[#89838f]">To {currentRequest.destination} · Requested {new Date(currentRequest.createdAt).toLocaleDateString()}</p></div></div> : <div className="mt-6 grid place-items-center rounded-[18px] border border-dashed border-[#dcd6e9] bg-[#fbfaff] px-5 py-10 text-center"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f0ecff] text-[#8054F6]"><WalletCards size={22}/></span><p className="mt-3 text-sm font-bold">Your available balance is ready</p><p className="mt-1 max-w-md text-xs leading-5 text-[#89838f]">Once submitted, the amount is reserved from your available balance so it cannot be withdrawn twice.</p></div>}</article><article className="surface rounded-[24px] p-6"><p className="text-xs font-semibold text-[#8054F6]">How your payout moves</p><h2 className="mt-2 text-xl font-extrabold">Four transparent checkpoints</h2><p className="mt-2 text-xs leading-5 text-[#89838f]">Every request keeps its status visible from submission to history.</p><div className="relative mt-5 space-y-4"><div className="absolute bottom-4 left-[15px] top-4 w-px bg-gradient-to-b from-[#ff2e91] via-[#8054F6] to-[#d8cff5]" aria-hidden="true"/>{[[Check,"Request received","Immediate"],[ShieldCheck,"Finance review","Within 1 business day"],[Banknote,"Payment sent","2–5 business days"],[Check,"Reconciled in history","After confirmation"]].map(([Icon,t,d]: any,i) => <div className="relative z-10 flex items-center gap-3" key={t}><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${i===0?"bg-[#8054F6] text-white shadow-[0_6px_16px_rgba(128,84,246,.25)]":"bg-[#f0ecf8] text-[#8054F6]"}`}><Icon size={14}/></span><div className="flex flex-1 items-center justify-between gap-2"><span className="text-sm font-bold">{t}</span><span className="text-xs text-[#918b98]">{d}</span></div></div>)}</div></article></section>
  <Dialog open={open} onOpenChange={(value) => { if (!value) close(); else setOpen(true); }}><DialogContent className="referee-portal-dialog rounded-[24px] sm:max-w-[520px]">{!submitted ? <><DialogHeader><DialogTitle className="text-2xl">Request a withdrawal</DialogTitle><DialogDescription>Only your available balance can be requested. Review the details before submitting.</DialogDescription></DialogHeader><form onSubmit={submit} className="mt-3 space-y-5"><label><Label>Amount in USD</Label><div className="relative mt-2"><span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[#77717e]">$</span><Input value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" className="h-12 pl-8 text-lg font-bold"/></div><div className="mt-2 flex justify-between text-xs text-[#8b8591]"><span>Minimum {formatMoney(MINIMUM_WITHDRAWAL)}</span><button type="button" onClick={() => setAmount(availableBalance.toFixed(2))} className="font-bold text-[#8054F6]">Use full balance</button></div></label><label><Label>Payout method</Label><Select value={withdrawalMethodId} onValueChange={setWithdrawalMethodId}><SelectTrigger className="mt-2 h-12"><SelectValue/></SelectTrigger><SelectContent>{methods.filter(method => method.status === "verified").map(method => <SelectItem value={method.id} key={method.id}>{method.provider} · {method.masked} · {method.currency}</SelectItem>)}</SelectContent></Select></label><div className="rounded-xl bg-[#f7f5ff] p-4 text-xs"><div className="flex justify-between"><span className="text-[#7d7784]">Requested amount</span><b>${amount || "0.00"}</b></div><div className="mt-2 flex justify-between"><span className="text-[#7d7784]">Estimated fee</span><b>Confirmed during finance review</b></div></div><div className="flex gap-2 text-xs leading-5 text-[#746e7b]"><CircleAlert className="mt-0.5 shrink-0 text-[#8054F6]" size={15}/>Requests are reviewed and paid manually by the Q-worship team.</div><DialogFooter><Button type="button" variant="outline" onClick={close} disabled={requestMutation.isPending}>Cancel</Button><Button type="submit" className="violet-button" disabled={requestMutation.isPending}>{requestMutation.isPending ? "Submitting…" : "Submit request"}</Button></DialogFooter></form></> : <div className="py-8 text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Check size={28}/></span><DialogTitle className="mt-5 text-2xl">Request received</DialogTitle><DialogDescription className="mx-auto mt-2 max-w-sm">Your ${amount} request is now pending review. Its status will appear here and in your payment history.</DialogDescription><div className="mx-auto mt-5 inline-flex items-center gap-2"><StatusPill label="pending"/></div><Button className="violet-button mt-7 w-full" onClick={() => { close(); toast.success("Withdrawal request recorded"); }}>Done</Button></div>}</DialogContent></Dialog>
  <PayoutMethodManager open={methodManagerOpen} onOpenChange={setMethodManagerOpen} methods={methods} onMethodsChange={updateMethods}/>
  </div>;
}
