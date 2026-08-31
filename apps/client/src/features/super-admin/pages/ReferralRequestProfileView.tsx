import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  CalendarDays,
  Briefcase,
  MessageSquareText,
  Check,
  X,
  Clock,
  User,
  Loader2,
} from 'lucide-react';

interface ReferralRequestRow {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  state?: string;
  phoneNumber: string;
  product: 'qworship' | 'go-green';
  about?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
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

export function ReferralRequestProfileView({ requestId, onBack }: { requestId: string; onBack: () => void }) {
  const { toast } = useToast();
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null);

  const { data, isLoading } = useQuery<{ success: boolean; requests: ReferralRequestRow[] }>({
    queryKey: ['/api/admin/referral-requests'],
  });
  const request = data?.requests.find((r) => r._id === requestId);

  const approveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/admin/referral-requests/${requestId}/approve`, {});
      return response.json();
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/referral-requests'] });
      setConfirmAction(null);
      toast({
        title: 'Referral approved',
        description: res.emailSent ? 'The referee account was created and credentials were emailed.' : res.warning || 'Account created, but the credentials email could not be sent.',
      });
      onBack();
    },
    onError: (error: any) => toast({ title: "Couldn't approve request", description: error?.message?.replace(/^\d+:\s*/, '') || 'Please try again.', variant: 'destructive' }),
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/admin/referral-requests/${requestId}/reject`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/referral-requests'] });
      setConfirmAction(null);
      toast({ title: 'Referral rejected', description: 'The application has been marked as rejected.' });
      onBack();
    },
    onError: (error: any) => toast({ title: "Couldn't reject request", description: error?.message?.replace(/^\d+:\s*/, '') || 'Please try again.', variant: 'destructive' }),
  });

  if (isLoading || !request) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400 dark:text-gray-500" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading application…</p>
      </div>
    );
  }

  const initials = ((request.firstName?.[0] || '') + (request.lastName?.[0] || '')).toUpperCase() || 'A';
  const ageDays = daysBetween(request.createdAt, new Date());

  return (
    <div className="space-y-6 p-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
        <ArrowLeft size={16} />
        Back to Referral Requests
      </button>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 text-lg font-bold text-blue-600 dark:from-blue-900/60 dark:to-blue-800/60 dark:text-blue-400">
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{request.firstName} {request.lastName}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400"><Mail size={14} />{request.email}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {request.status === 'pending' && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700">Pending</Badge>}
          {request.status === 'approved' && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700">Approved</Badge>}
          {request.status === 'rejected' && <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700">Rejected</Badge>}
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700">{PRODUCT_LABELS[request.product] || request.product}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:border-blue-700/50 dark:bg-gradient-to-br dark:from-blue-900/20 dark:to-blue-800/10">
          <CardContent className="p-6">
            <div className="w-fit rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-600/20 dark:text-blue-400"><CalendarDays className="h-5 w-5" /></div>
            <div className="mt-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatDate(request.createdAt)}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Submitted</div>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{ageDays} day{ageDays === 1 ? '' : 's'} ago</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:border-purple-700/50 dark:bg-gradient-to-br dark:from-purple-900/20 dark:to-purple-800/10">
          <CardContent className="p-6">
            <div className="w-fit rounded-lg bg-purple-100 p-2 text-purple-600 dark:bg-purple-600/20 dark:text-purple-400"><MapPin className="h-5 w-5" /></div>
            <div className="mt-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{request.country || '—'}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Country</div>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{request.state || 'No state provided'}</div>
            </div>
          </CardContent>
        </Card>
        <Card className={request.status === 'pending' ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:border-amber-700/50 dark:bg-gradient-to-br dark:from-amber-900/20 dark:to-amber-800/10' : request.status === 'approved' ? 'border-green-200 bg-gradient-to-br from-green-50 to-green-100/50 dark:border-green-700/50 dark:bg-gradient-to-br dark:from-green-900/20 dark:to-green-800/10' : 'border-red-200 bg-gradient-to-br from-red-50 to-red-100/50 dark:border-red-700/50 dark:bg-gradient-to-br dark:from-red-900/20 dark:to-red-800/10'}>
          <CardContent className="p-6">
            <div className={`w-fit rounded-lg p-2 ${request.status === 'pending' ? 'bg-amber-100 text-amber-600 dark:bg-amber-600/20 dark:text-amber-400' : request.status === 'approved' ? 'bg-green-100 text-green-600 dark:bg-green-600/20 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-600/20 dark:text-red-400'}`}><Clock className="h-5 w-5" /></div>
            <div className="mt-4">
              <div className="text-2xl font-bold capitalize text-gray-900 dark:text-white">{request.status}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Application Status</div>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{request.status === 'pending' ? 'Awaiting review' : 'Review complete'}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="dark:border-gray-700 dark:bg-gray-800/80">
          <CardHeader><CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100"><User className="h-5 w-5" />Contact Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3"><Mail size={16} className="mt-0.5 shrink-0 text-gray-400" /><div><div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Email</div><div className="text-sm text-gray-900 dark:text-gray-100">{request.email}</div></div></div>
            <div className="flex items-start gap-3"><Phone size={16} className="mt-0.5 shrink-0 text-gray-400" /><div><div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Phone</div><div className="text-sm text-gray-900 dark:text-gray-100">{request.phoneNumber || '—'}</div></div></div>
            <div className="flex items-start gap-3"><MapPin size={16} className="mt-0.5 shrink-0 text-gray-400" /><div><div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Location</div><div className="text-sm text-gray-900 dark:text-gray-100">{request.country || '—'}{request.state ? `, ${request.state}` : ''}</div></div></div>
            <div className="flex items-start gap-3"><Briefcase size={16} className="mt-0.5 shrink-0 text-gray-400" /><div><div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Product interest</div><div className="text-sm text-gray-900 dark:text-gray-100">{PRODUCT_LABELS[request.product] || request.product}</div></div></div>
          </CardContent>
        </Card>
        <Card className="dark:border-gray-700 dark:bg-gray-800/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100"><MessageSquareText className="h-5 w-5" />About Them</CardTitle>
            <CardDescription className="text-gray-500 dark:text-gray-400">What they shared on the application form</CardDescription>
          </CardHeader>
          <CardContent>
            {request.about ? (
              <p className="text-sm leading-6 text-gray-700 dark:text-gray-300">{request.about}</p>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No additional information was provided.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {request.status === 'pending' && (
        <Card className="dark:border-gray-700 dark:bg-gray-800/80">
          <CardHeader><CardTitle className="text-gray-900 dark:text-gray-100">Review this application</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button className="bg-green-600 text-white hover:bg-green-700" onClick={() => setConfirmAction('approve')}>
              <Check className="mr-2 h-4 w-4" />
              Approve &amp; create account
            </Button>
            <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400" onClick={() => setConfirmAction('reject')}>
              <X className="mr-2 h-4 w-4" />
              Reject
            </Button>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction === 'approve' ? 'Approve this referral partner?' : 'Reject this application?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'approve'
                ? `This creates a referee account for ${request.email} and emails them a username and temporary password.`
                : `${request.email} will be marked as rejected. No account will be created.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={approveMutation.isPending || rejectMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={approveMutation.isPending || rejectMutation.isPending}
              onClick={() => (confirmAction === 'approve' ? approveMutation.mutate() : rejectMutation.mutate())}
              className={confirmAction === 'reject' ? 'bg-red-600 text-white hover:bg-red-700' : undefined}
            >
              {confirmAction === 'approve' ? 'Approve & create account' : 'Reject application'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
