import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  User,
  MoreHorizontal,
  Eye,
  Check,
  X,
} from 'lucide-react';
import { ReferralRequestProfileView } from './ReferralRequestProfileView';

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

export function ReferralRequestsView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ type: 'approve' | 'reject'; request: ReferralRequestRow } | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data, isLoading, refetch } = useQuery<{ success: boolean; requests: ReferralRequestRow[] }>({
    queryKey: ['/api/admin/referral-requests'],
  });

  const requests = data?.requests || [];
  const filtered = requests.filter((request) => {
    const term = searchTerm.toLowerCase();
    return (
      request.firstName?.toLowerCase().includes(term) ||
      request.lastName?.toLowerCase().includes(term) ||
      request.email?.toLowerCase().includes(term)
    );
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('POST', `/api/admin/referral-requests/${id}/approve`, {});
      return response.json();
    },
    onSuccess: (data) => {
      refetch();
      setConfirmAction(null);
      toast({
        title: 'Referral approved',
        description: data.emailSent
          ? 'The referee account was created and credentials were emailed.'
          : data.warning || 'Account created, but the credentials email could not be sent.',
      });
    },
    onError: (error: any) => {
      toast({
        title: "Couldn't approve request",
        description: error?.message?.replace(/^\d+:\s*/, '') || 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('POST', `/api/admin/referral-requests/${id}/reject`, {});
      return response.json();
    },
    onSuccess: () => {
      refetch();
      setConfirmAction(null);
      toast({ title: 'Referral rejected', description: 'The application has been marked as rejected.' });
    },
    onError: (error: any) => {
      toast({
        title: "Couldn't reject request",
        description: error?.message?.replace(/^\d+:\s*/, '') || 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const statusBadge = (status: ReferralRequestRow['status']) => {
    if (status === 'approved') return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700">Approved</Badge>;
    if (status === 'rejected') return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700">Rejected</Badge>;
    return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700">Pending</Badge>;
  };

  if (viewingId) {
    return <ReferralRequestProfileView requestId={viewingId} onBack={() => setViewingId(null)} />;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Referral Requests</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Review and approve referral partner applications</p>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/60 dark:to-blue-800/60 rounded-xl">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{requests.length}</p>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/60 dark:to-amber-800/60 rounded-xl">
              <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{requests.filter((r) => r.status === 'pending').length}</p>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/60 dark:to-green-800/60 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{requests.filter((r) => r.status === 'approved').length}</p>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Approved</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/60 dark:to-red-800/60 rounded-xl">
              <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{requests.filter((r) => r.status === 'rejected').length}</p>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Rejected</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">All Applications</h3>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <Input
                placeholder="Search applicants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
              />
            </div>
          </div>
        </div>

        <div className="overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Applicant</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Product</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Submitted</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-gray-50 dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="animate-spin w-8 h-8 border-4 border-blue-500 dark:border-blue-400 border-t-transparent rounded-full" />
                      <p className="text-sm text-gray-600 dark:text-gray-300">Loading referral requests...</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="text-gray-500 dark:text-gray-400">
                      <Users className="mx-auto h-12 w-12 mb-4 opacity-50 text-gray-400 dark:text-gray-500" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No referral requests found</h3>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                        {searchTerm ? 'Try adjusting your search criteria.' : 'Applications from /refer-and-earn/join will appear here.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((request) => (
                  <tr key={request._id} className="hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => setViewingId(request._id)}
                        className="flex items-center text-left transition hover:opacity-80"
                      >
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 flex items-center justify-center shadow-sm">
                            <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-gray-900 hover:underline dark:text-white">{request.firstName} {request.lastName}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-300">{request.email}</div>
                        </div>
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-600 dark:text-gray-300">
                      {PRODUCT_LABELS[request.product] || request.product}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{statusBadge(request.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 mx-auto">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 shadow-lg dark:shadow-gray-900/50">
                          <DropdownMenuItem onClick={() => setViewingId(request._id)} className="text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          {request.status === 'pending' && (
                            <>
                              <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
                              <DropdownMenuItem
                                onClick={() => setConfirmAction({ type: 'approve', request })}
                                className="text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30"
                              >
                                <Check className="mr-2 h-4 w-4" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setConfirmAction({ type: 'reject', request })}
                                className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                              >
                                <X className="mr-2 h-4 w-4" />
                                Reject
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'approve' ? 'Approve this referral partner?' : 'Reject this application?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'approve'
                ? `This creates a referee account for ${confirmAction?.request.email} and emails them a username and temporary password.`
                : `${confirmAction?.request.email} will be marked as rejected. No account will be created.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={approveMutation.isPending || rejectMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={approveMutation.isPending || rejectMutation.isPending}
              onClick={() => {
                if (!confirmAction) return;
                if (confirmAction.type === 'approve') approveMutation.mutate(confirmAction.request._id);
                else rejectMutation.mutate(confirmAction.request._id);
              }}
              className={confirmAction?.type === 'reject' ? 'bg-red-600 text-white hover:bg-red-700' : undefined}
            >
              {confirmAction?.type === 'approve' ? 'Approve & create account' : 'Reject application'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
