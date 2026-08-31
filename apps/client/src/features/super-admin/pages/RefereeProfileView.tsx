import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import StatusPill from "../../referee-portal/components/StatusPill";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  CalendarDays,
  Clock3,
  Briefcase,
  MessageSquareText,
  UserCog,
  ShieldCheck,
  ShieldOff,
  KeyRound,
  Loader2,
  User,
  Hourglass,
  Activity,
  Building2,
  Link2,
} from 'lucide-react';

interface RefereeRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  countryCode?: string;
  phoneNumber?: string;
  referralCode?: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLogin: string | null;
  createdAt: string;
}

interface ReferredChurch {
  id: string;
  church: string;
  city: string;
  country: string;
  plan: string;
  status: string;
  date: string;
}

interface RefereeApplication {
  id: string;
  country?: string;
  state?: string;
  product: 'qworship' | 'go-green';
  about?: string;
  appliedAt: string;
  approvedAt?: string;
  approvedBy?: { firstName?: string; lastName?: string; email?: string } | null;
}

const PRODUCT_LABELS: Record<string, string> = { qworship: 'Q-worship', 'go-green': 'Go-Green' };

function daysBetween(a: string | Date, b: string | Date) {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function RefereeProfileView({ refereeId, onBack }: { refereeId: string; onBack: () => void }) {
  const { toast } = useToast();
  const [confirmAction, setConfirmAction] = useState<'suspend' | 'reactivate' | 'reset-password' | null>(null);

  const { data, isLoading } = useQuery<{ success: boolean; referee: RefereeRow; application: RefereeApplication | null }>({
    queryKey: [`/api/admin/referrals/${refereeId}`],
  });

  const referee = data?.referee;
  const application = data?.application;

  const { data: churchesData, isLoading: churchesLoading } = useQuery<{ success: boolean; churches: ReferredChurch[] }>({
    queryKey: [`/api/admin/referrals/${refereeId}/organizations`],
  });
  const referredChurches = churchesData?.churches || [];

  const suspendMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/admin/referrals/${refereeId}/suspend`, {});
      return response.json();
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/referrals/${refereeId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/referrals'] });
      setConfirmAction(null);
      toast({
        title: res.referee?.isActive ? 'Referral partner reactivated' : 'Referral partner suspended',
        description: res.referee?.isActive ? 'This referral partner can sign in again.' : 'This referral partner can no longer sign in.',
      });
    },
    onError: (error: any) => toast({ title: "Couldn't update account", description: error?.message?.replace(/^\d+:\s*/, '') || 'Please try again.', variant: 'destructive' }),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/admin/referrals/${refereeId}/reset-password`, {});
      return response.json();
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/referrals/${refereeId}`] });
      setConfirmAction(null);
      toast({
        title: 'Password reset',
        description: res.emailSent ? 'A new temporary password was emailed to the referral partner.' : res.warning || 'Password was reset, but the notification email could not be sent.',
      });
    },
    onError: (error: any) => toast({ title: "Couldn't reset password", description: error?.message?.replace(/^\d+:\s*/, '') || 'Please try again.', variant: 'destructive' }),
  });

  if (isLoading || !referee) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400 dark:text-gray-500" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading referral partner profile…</p>
      </div>
    );
  }

  const initials = ((referee.firstName?.[0] || '') + (referee.lastName?.[0] || '')).toUpperCase() || 'RP';
  const statusLabel = !referee.isActive ? 'Suspended' : referee.mustChangePassword ? 'Pending setup' : 'Active';
  const accountAgeDays = daysBetween(referee.createdAt, new Date());
  const reviewDays = application?.approvedAt ? daysBetween(application.appliedAt, application.approvedAt) : null;

  return (
    <div className="space-y-6 p-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
        <ArrowLeft size={16} />
        Back to Referrals
      </button>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 text-lg font-bold text-blue-600 dark:from-blue-900/60 dark:to-blue-800/60 dark:text-blue-400">
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{referee.firstName} {referee.lastName}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400"><Mail size={14} />{referee.email}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {statusLabel === 'Active' && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700">Active</Badge>}
          {statusLabel === 'Pending setup' && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700">Pending setup</Badge>}
          {statusLabel === 'Suspended' && <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700">Suspended</Badge>}
          {application && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700">{PRODUCT_LABELS[application.product] || application.product}</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:border-blue-700/50 dark:bg-gradient-to-br dark:from-blue-900/20 dark:to-blue-800/10">
          <CardContent className="p-6">
            <div className="rounded-lg bg-blue-100 p-2 text-blue-600 w-fit dark:bg-blue-600/20 dark:text-blue-400"><CalendarDays className="h-5 w-5" /></div>
            <div className="mt-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{accountAgeDays}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Days as Partner</div>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Since {formatDate(referee.createdAt)}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:border-purple-700/50 dark:bg-gradient-to-br dark:from-purple-900/20 dark:to-purple-800/10">
          <CardContent className="p-6">
            <div className="rounded-lg bg-purple-100 p-2 text-purple-600 w-fit dark:bg-purple-600/20 dark:text-purple-400"><Hourglass className="h-5 w-5" /></div>
            <div className="mt-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{reviewDays ?? '—'}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Days to Approve</div>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{application ? `Applied ${formatDate(application.appliedAt)}` : 'No application on file'}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:border-emerald-700/50 dark:bg-gradient-to-br dark:from-emerald-900/20 dark:to-emerald-800/10">
          <CardContent className="p-6">
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600 w-fit dark:bg-emerald-600/20 dark:text-emerald-400"><Activity className="h-5 w-5" /></div>
            <div className="mt-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{referee.lastLogin ? formatDate(referee.lastLogin) : 'Never'}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Last Sign-in</div>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{referee.lastLogin ? `${daysBetween(referee.lastLogin, new Date())} days ago` : 'Has not signed in yet'}</div>
            </div>
          </CardContent>
        </Card>
        <Card className={statusLabel === 'Suspended' ? 'border-red-200 bg-gradient-to-br from-red-50 to-red-100/50 dark:border-red-700/50 dark:bg-gradient-to-br dark:from-red-900/20 dark:to-red-800/10' : 'border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:border-amber-700/50 dark:bg-gradient-to-br dark:from-amber-900/20 dark:to-amber-800/10'}>
          <CardContent className="p-6">
            <div className={`w-fit rounded-lg p-2 ${statusLabel === 'Suspended' ? 'bg-red-100 text-red-600 dark:bg-red-600/20 dark:text-red-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-600/20 dark:text-amber-400'}`}>{statusLabel === 'Suspended' ? <ShieldOff className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}</div>
            <div className="mt-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{statusLabel}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Account Status</div>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{referee.mustChangePassword ? 'Has not set their own password yet' : 'Password configured'}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid h-auto grid-cols-2 gap-1 rounded-xl border border-gray-200 bg-white/80 p-1 shadow-sm dark:border-gray-700/50 dark:bg-gray-800/50 sm:grid-cols-4">
          <TabsTrigger value="overview" className="flex h-12 items-center justify-center gap-2 rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white"><User className="h-4 w-4" />Overview</TabsTrigger>
          <TabsTrigger value="application" className="flex h-12 items-center justify-center gap-2 rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white"><Briefcase className="h-4 w-4" />Application</TabsTrigger>
          <TabsTrigger value="referrals" className="flex h-12 items-center justify-center gap-2 rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white"><Building2 className="h-4 w-4" />Referred Clients</TabsTrigger>
          <TabsTrigger value="actions" className="flex h-12 items-center justify-center gap-2 rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white"><UserCog className="h-4 w-4" />Security &amp; Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="dark:border-gray-700 dark:bg-gray-800/80">
              <CardHeader><CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100"><User className="h-5 w-5" />Contact Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3"><Mail size={16} className="mt-0.5 shrink-0 text-gray-400" /><div><div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Email</div><div className="text-sm text-gray-900 dark:text-gray-100">{referee.email}</div></div></div>
                <div className="flex items-start gap-3"><Phone size={16} className="mt-0.5 shrink-0 text-gray-400" /><div><div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Phone</div><div className="text-sm text-gray-900 dark:text-gray-100">{referee.phoneNumber || '—'}</div></div></div>
                <div className="flex items-start gap-3"><MapPin size={16} className="mt-0.5 shrink-0 text-gray-400" /><div><div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Country</div><div className="text-sm text-gray-900 dark:text-gray-100">{application?.country || referee.countryCode || '—'}{application?.state ? `, ${application.state}` : ''}</div></div></div>
              </CardContent>
            </Card>
            <Card className="dark:border-gray-700 dark:bg-gray-800/80">
              <CardHeader><CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100"><CalendarDays className="h-5 w-5" />Account Timeline</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {application && <div className="flex items-start gap-3"><Briefcase size={16} className="mt-0.5 shrink-0 text-gray-400" /><div><div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Applied</div><div className="text-sm text-gray-900 dark:text-gray-100">{formatDate(application.appliedAt)}</div></div></div>}
                {application?.approvedAt && <div className="flex items-start gap-3"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-gray-400" /><div><div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Approved</div><div className="text-sm text-gray-900 dark:text-gray-100">{formatDate(application.approvedAt)}{application.approvedBy ? ` by ${application.approvedBy.firstName} ${application.approvedBy.lastName}` : ''}</div></div></div>}
                <div className="flex items-start gap-3"><User size={16} className="mt-0.5 shrink-0 text-gray-400" /><div><div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Account created</div><div className="text-sm text-gray-900 dark:text-gray-100">{formatDate(referee.createdAt)}</div></div></div>
                <div className="flex items-start gap-3"><Clock3 size={16} className="mt-0.5 shrink-0 text-gray-400" /><div><div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Last sign-in</div><div className="text-sm text-gray-900 dark:text-gray-100">{referee.lastLogin ? formatDate(referee.lastLogin) : 'Never signed in'}</div></div></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="application" className="space-y-6">
          <Card className="dark:border-gray-700 dark:bg-gray-800/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100"><Briefcase className="h-5 w-5" />Original Application</CardTitle>
              <CardDescription className="text-gray-500 dark:text-gray-400">What they submitted on the Refer &amp; Earn join form</CardDescription>
            </CardHeader>
            <CardContent>
              {application ? (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900/40"><div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Product interest</div><div className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{PRODUCT_LABELS[application.product] || application.product}</div></div>
                    <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900/40"><div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Location</div><div className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{application.country || '—'}{application.state ? `, ${application.state}` : ''}</div></div>
                    <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900/40"><div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Applied on</div><div className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{formatDate(application.appliedAt)}</div></div>
                    <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900/40"><div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Reviewed on</div><div className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{application.approvedAt ? formatDate(application.approvedAt) : 'Pending'}{application.approvedBy ? <span className="block text-xs font-normal text-gray-500 dark:text-gray-400">by {application.approvedBy.firstName} {application.approvedBy.lastName} ({application.approvedBy.email})</span> : null}</div></div>
                  </div>
                  {application.about && (
                    <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900/40">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"><MessageSquareText size={14} />About them</div>
                      <p className="mt-2 text-sm leading-6 text-gray-700 dark:text-gray-300">{application.about}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No linked application was found for this account.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrals" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="dark:border-gray-700 dark:bg-gray-800/80">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-600/20 dark:text-blue-400"><Building2 className="h-5 w-5" /></div>
                <div><div className="text-xl font-bold text-gray-900 dark:text-white">{referredChurches.length}</div><div className="text-xs text-gray-500 dark:text-gray-400">Churches referred</div></div>
              </CardContent>
            </Card>
            <Card className="dark:border-gray-700 dark:bg-gray-800/80">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-600/20 dark:text-emerald-400"><ShieldCheck className="h-5 w-5" /></div>
                <div><div className="text-xl font-bold text-gray-900 dark:text-white">{referredChurches.filter((c) => c.status === 'active').length}</div><div className="text-xs text-gray-500 dark:text-gray-400">Active subscribers</div></div>
              </CardContent>
            </Card>
            <Card className="dark:border-gray-700 dark:bg-gray-800/80">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="rounded-lg bg-purple-100 p-2 text-purple-600 dark:bg-purple-600/20 dark:text-purple-400"><Link2 className="h-5 w-5" /></div>
                <div><div className="text-xl font-bold text-gray-900 dark:text-white">{referee.referralCode || '—'}</div><div className="text-xs text-gray-500 dark:text-gray-400">Referral code</div></div>
              </CardContent>
            </Card>
          </div>

          <Card className="dark:border-gray-700 dark:bg-gray-800/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100"><Link2 className="h-5 w-5" />Referred churches</CardTitle>
              <CardDescription className="text-gray-500 dark:text-gray-400">Churches that signed up using this referral partner's code</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {churchesLoading ? (
                <div className="flex flex-col items-center gap-3 py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400 dark:text-gray-500" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Loading referred churches…</p>
                </div>
              ) : referredChurches.length === 0 ? (
                <div className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                  No churches have signed up using this referral partner's code yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-left">
                    <thead className="bg-gray-50 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
                      <tr>
                        <th className="px-6 py-3">Church</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Plan</th>
                        <th className="px-6 py-3">Introduced</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {referredChurches.map((church) => (
                        <tr key={church.id} className="text-sm hover:bg-gray-50 dark:hover:bg-gray-700/40">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-gray-900 dark:text-white">{church.church}</div>
                            <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{church.city}{church.city && church.country ? ', ' : ''}{church.country}</div>
                          </td>
                          <td className="px-4 py-4"><StatusPill label={church.status} /></td>
                          <td className="px-4 py-4 capitalize text-gray-700 dark:text-gray-300">{church.plan}</td>
                          <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{formatDate(church.date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-6">
          <Card className="dark:border-gray-700 dark:bg-gray-800/80">
            <CardHeader><CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100"><UserCog className="h-5 w-5" />Account controls</CardTitle></CardHeader>
            <CardContent className="divide-y divide-gray-200 dark:divide-gray-700">
              <div className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center">
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Reset password</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Emails a new temporary password and requires them to set a new one on next sign-in.</div>
                </div>
                <Button variant="outline" onClick={() => setConfirmAction('reset-password')}><KeyRound className="mr-2 h-4 w-4" />Reset Password</Button>
              </div>
              <div className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center">
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{referee.isActive ? 'Suspend account' : 'Reactivate account'}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{referee.isActive ? 'They will immediately lose the ability to sign in.' : 'They will be able to sign in again.'}</div>
                </div>
                {referee.isActive ? (
                  <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400" onClick={() => setConfirmAction('suspend')}><ShieldOff className="mr-2 h-4 w-4" />Suspend</Button>
                ) : (
                  <Button variant="outline" className="border-green-200 text-green-700 hover:bg-green-50 dark:border-green-900 dark:text-green-400" onClick={() => setConfirmAction('reactivate')}><ShieldCheck className="mr-2 h-4 w-4" />Reactivate</Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'suspend' && 'Suspend this referral partner?'}
              {confirmAction === 'reactivate' && 'Reactivate this referral partner?'}
              {confirmAction === 'reset-password' && "Reset this referral partner's password?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'suspend' && `${referee.email} will no longer be able to sign in until reactivated.`}
              {confirmAction === 'reactivate' && `${referee.email} will be able to sign in again.`}
              {confirmAction === 'reset-password' && `A new temporary password will be emailed to ${referee.email}, and they will be asked to change it on next sign-in.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={suspendMutation.isPending || resetPasswordMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={suspendMutation.isPending || resetPasswordMutation.isPending}
              onClick={() => (confirmAction === 'reset-password' ? resetPasswordMutation.mutate() : suspendMutation.mutate())}
              className={confirmAction === 'suspend' ? 'bg-red-600 text-white hover:bg-red-700' : undefined}
            >
              {confirmAction === 'suspend' && 'Suspend account'}
              {confirmAction === 'reactivate' && 'Reactivate account'}
              {confirmAction === 'reset-password' && 'Reset password'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
