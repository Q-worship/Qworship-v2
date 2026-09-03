/** Quiet Momentum analytics: readable funnel, territory, and campaign insight — built only from real referral data. */
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Loader2, Megaphone, TrendingUp, UsersRound } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { toast } from "../lib/toast";

interface ReferredOrganization {
  id: string;
  church: string;
  city: string;
  country: string;
  plan: string;
  status: "active" | "inactive" | "trial" | "cancelled";
  date: string;
}

const COLORS = ["#8054F6", "#ff2e91", "#47b998", "#f2aa4c", "#4c9bf2", "#c98f4c"];

export default function Analytics() {
  const { data, isLoading } = useQuery<{ churches: ReferredOrganization[] }>({ queryKey: ["/api/referrals/my-organizations"] });
  const organizations = data?.churches || [];

  const total = organizations.length;
  const trialCount = organizations.filter((o) => o.status === "trial").length;
  const paidCount = organizations.filter((o) => o.status === "active").length;
  const trialToPaidRate = trialCount + paidCount > 0 ? Math.round((paidCount / (trialCount + paidCount)) * 1000) / 10 : 0;

  const funnel = [
    { label: "Signed up", value: total, rate: "100%" },
    { label: "Trial", value: trialCount, rate: total > 0 ? `${Math.round((trialCount / total) * 100)}%` : "0%" },
    { label: "Paid", value: paidCount, rate: total > 0 ? `${Math.round((paidCount / total) * 100)}%` : "0%" },
  ];

  const countryCounts = new Map<string, number>();
  for (const org of organizations) {
    const name = org.country || "Unknown";
    countryCounts.set(name, (countryCounts.get(name) || 0) + 1);
  }
  const countries = Array.from(countryCounts.entries())
    .map(([name, count]) => ({ name, value: total > 0 ? Math.round((count / total) * 100) : 0, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold tracking-[.15em] text-[#8054F6] uppercase">Analytics</p>
          <h1 className="mt-2 text-[34px] font-extrabold">See which introductions become impact.</h1>
          <p className="mt-2 text-sm text-[#77727f]">Follow signups, trials, paid churches, and country mix.</p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="90">
            <SelectTrigger className="h-11 w-36 rounded-xl bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">This year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="h-11 rounded-xl bg-white" onClick={() => toast.success("Analytics CSV prepared")}>
            <Download size={17} />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="surface mt-7 flex items-center justify-center gap-2 rounded-[24px] py-16 text-sm text-[#8a8491]">
          <Loader2 className="animate-spin" size={16} />
          Loading analytics...
        </div>
      ) : (
        <>
          <section className="mt-7 grid gap-4 sm:grid-cols-3">
            <article className="surface rounded-[22px] p-5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-[#8054F6]">
                <UsersRound size={19} />
              </span>
              <div className="metric-number mt-5 text-3xl font-extrabold">{total}</div>
              <div className="mt-1 text-sm font-bold">Churches referred</div>
              <p className="mt-2 text-xs text-[#8b8591]">Total organizations attributed to your code</p>
            </article>
            <article className="surface rounded-[22px] p-5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                <TrendingUp size={19} />
              </span>
              <div className="metric-number mt-5 text-3xl font-extrabold">{paidCount}</div>
              <div className="mt-1 text-sm font-bold">Active paid churches</div>
              <p className="mt-2 text-xs text-[#8b8591]">Currently on a paid subscription</p>
            </article>
            <article className="surface rounded-[22px] p-5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-pink-50 text-[#ff2e91]">
                <TrendingUp size={19} />
              </span>
              <div className="metric-number mt-5 text-3xl font-extrabold">{trialToPaidRate}%</div>
              <div className="mt-1 text-sm font-bold">Trial to paid</div>
              <p className="mt-2 text-xs text-[#8b8591]">Of churches that reached trial or paid</p>
            </article>
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[1.12fr_.88fr]">
            <article className="surface rounded-[24px] p-6">
              <p className="text-xs font-bold tracking-[.12em] text-[#8d8997] uppercase">Conversion funnel</p>
              <h2 className="mt-2 text-xl font-extrabold">How churches progressed</h2>
              {total === 0 ? (
                <p className="mt-6 text-sm text-[#8a8491]">No referred churches yet. Once someone signs up with your code, their progress will show here.</p>
              ) : (
                <div className="mt-7 space-y-3">
                  {funnel.map((step, i) => (
                    <div key={step.label} className="flex items-center gap-4">
                      <div className="w-24 text-xs font-semibold text-[#67616e]">{step.label}</div>
                      <div className="flex-1">
                        <div className="relative h-11 overflow-hidden rounded-xl bg-[#f1eef8]">
                          <div
                            className="flex h-full items-center rounded-xl px-4 text-sm font-extrabold text-white"
                            style={{ width: `${100 - i * 22}%`, background: i === 2 ? "#47b998" : "#8054F6", opacity: 1 - i * 0.12 }}
                          >
                            {step.value}
                          </div>
                        </div>
                      </div>
                      <div className="w-12 text-right text-xs font-bold text-[#837d89]">{step.rate}</div>
                    </div>
                  ))}
                </div>
              )}
            </article>
            <article className="surface rounded-[24px] p-6">
              <p className="text-xs font-bold tracking-[.12em] text-[#8d8997] uppercase">Geography</p>
              <h2 className="mt-2 text-xl font-extrabold">Referred churches by country</h2>
              {countries.length === 0 ? (
                <p className="mt-6 text-sm text-[#8a8491]">No country data yet.</p>
              ) : (
                <div className="mt-3 grid grid-cols-[1fr_.9fr] items-center">
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={countries} dataKey="count" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={4} stroke="none">
                          {countries.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ border: 0, borderRadius: 12, boxShadow: "0 12px 30px rgba(39,31,63,.12)", fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    {countries.map((c, i) => (
                      <div key={c.name} className="flex items-center justify-between gap-3 text-xs">
                        <span className="flex items-center gap-2 text-[#69636f]">
                          <i className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                          {c.name}
                        </span>
                        <b>{c.value}%</b>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>
          </section>

          <section className="surface mt-5 rounded-[24px] p-6">
            <p className="text-xs font-bold tracking-[.12em] text-[#8d8997] uppercase">Campaign quality</p>
            <h2 className="mt-2 text-xl font-extrabold">Which share paths perform</h2>
            <div className="mt-5 flex flex-col items-center justify-center gap-3 rounded-2xl bg-[#faf8ff] py-12 text-center">
              <Megaphone className="text-[#c9c3d4]" size={28} />
              <p className="text-sm font-semibold text-[#4a4553]">Campaign tracking isn't live yet</p>
              <p className="max-w-sm text-xs text-[#8a8491]">
                Create a campaign link from the Referrals page, and clicks, trials, and paid conversions for each one will appear here once tracking ships.
              </p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
