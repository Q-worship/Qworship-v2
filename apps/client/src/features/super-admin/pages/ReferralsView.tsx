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
  UserCheck,
  Hourglass,
  Ban,
  Search,
  User,
  MoreHorizontal,
  Eye,
  KeyRound,
  ShieldOff,
  ShieldCheck,
} from 'lucide-react';
import { RefereeProfileView } from './RefereeProfileView';

interface RefereeRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  countryCode?: string;
  phoneNumber?: string;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLogin: string | null;
  createdAt: string;
}

export function ReferralsView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ type: 'suspend' | 'reactivate' | 'reset-password'; referee: RefereeRow } | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data, isLoading, refetch } = useQuery<{ success: boolean; referees: RefereeRow[] }>({
    queryKey: ['/api/admin/referrals'],
  });

  const referees = data?.referees || [];

  const filtered = referees.filter((referee) => {
    const term = searchTerm.toLowerCase();
    return (
      referee.firstName?.toLowerCase().includes(term) ||
      referee.lastName?.toLowerCase().includes(term) ||
      referee.email?.toLowerCase().includes(term)
    );
  });

  const suspendMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('POST', `/api/admin/referrals/${id}/suspend`, {});
      return response.json();
    },
    onSuccess: (data) => {
      refetch();
      if (viewingId) queryClient.invalidateQueries({ queryKey: [`/api/admin/referrals/${viewingId}`] });
      setConfirmAction(null);
      toast({
        title: data.referee?.isActive ? 'Referral partner reactivated' : 'Referral partner suspended',
        description: data.referee?.isActive
          ? 'This referral partner can sign in again.'
          : 'This referral partner can no longer sign in.',
      });
    },
    onError: (error: any) => {
      toast({
        title: "Couldn't update account",
        description: error?.message?.replace(/^\d+:\s*/, '') || 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('POST', `/api/admin/referrals/${id}/reset-password`, {});
      return response.json();
    },
    onSuccess: (data) => {
      refetch();
      if (viewingId) queryClient.invalidateQueries({ queryKey: [`/api/admin/referrals/${viewingId}`] });
      setConfirmAction(null);
      toast({
        title: 'Password reset',
        description: data.emailSent
          ? 'A new temporary password was emailed to the referral partner.'
          : data.warning || 'Password was reset, but the notification email could not be sent.',
      });
    },
    onError: (error: any) => {
      toast({
        title: "Couldn't reset password",
        description: error?.message?.replace(/^\d+:\s*/, '') || 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const statusBadge = (referee: RefereeRow) => {
    if (!referee.isActive) return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700">Suspended</Badge>;
    if (referee.mustChangePassword) return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700">Pending setup</Badge>;
    return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700">Active</Badge>;
  };

  if (viewingId) {
    return <RefereeProfileView refereeId={viewingId} onBack={() => setViewingId(null)} />;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Referrals</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Registered referral partner accounts</p>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/60 dark:to-blue-800/60 rounded-xl">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{referees.length}</p>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/60 dark:to-green-800/60 rounded-xl">
              <UserCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{referees.filter((r) => r.isActive && !r.mustChangePassword).length}</p>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/60 dark:to-amber-800/60 rounded-xl">
              <Hourglass className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{referees.filter((r) => r.mustChangePassword).length}</p>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending setup</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/60 dark:to-red-800/60 rounded-xl">
              <Ban className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{referees.filter((r) => !r.isActive).length}</p>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Suspended</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">All Referral Partners</h3>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <Input
                placeholder="Search referral partners..."
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
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Referral Partner</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-gray-50 dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="animate-spin w-8 h-8 border-4 border-blue-500 dark:border-blue-400 border-t-transparent rounded-full" />
                      <p className="text-sm text-gray-600 dark:text-gray-300">Loading referral partners...</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="text-gray-500 dark:text-gray-400">
                      <Users className="mx-auto h-12 w-12 mb-4 opacity-50 text-gray-400 dark:text-gray-500" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No referral partners yet</h3>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                        {searchTerm ? 'Try adjusting your search criteria.' : 'Accounts created by approving a Referral Request will appear here.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((referee) => (
                  <tr key={referee.id} className="hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => setViewingId(referee.id)}
                        className="flex items-center text-left transition hover:opacity-80"
                      >
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 flex items-center justify-center shadow-sm">
                            <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-gray-900 hover:underline dark:text-white">{referee.firstName} {referee.lastName}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-300">{referee.email}</div>
                        </div>
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-600 dark:text-gray-300">
                      {referee.phoneNumber || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{statusBadge(referee)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {new Date(referee.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 mx-auto">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 shadow-lg dark:shadow-gray-900/50">
                          <DropdownMenuItem onClick={() => setViewingId(referee.id)} className="text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
                          <DropdownMenuItem
                            onClick={() => setConfirmAction({ type: 'reset-password', referee })}
                            className="text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                          >
                            <KeyRound className="mr-2 h-4 w-4" />
                            Reset Password
                          </DropdownMenuItem>
                          {referee.isActive ? (
                            <DropdownMenuItem
                              onClick={() => setConfirmAction({ type: 'suspend', referee })}
                              className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                            >
                              <ShieldOff className="mr-2 h-4 w-4" />
                              Suspend
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => setConfirmAction({ type: 'reactivate', referee })}
                              className="text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30"
                            >
                              <ShieldCheck className="mr-2 h-4 w-4" />
                              Reactivate
                            </DropdownMenuItem>
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
              {confirmAction?.type === 'suspend' && 'Suspend this referral partner?'}
              {confirmAction?.type === 'reactivate' && 'Reactivate this referral partner?'}
              {confirmAction?.type === 'reset-password' && 'Reset this referral partner\'s password?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'suspend' && `${confirmAction?.referee.email} will no longer be able to sign in until reactivated.`}
              {confirmAction?.type === 'reactivate' && `${confirmAction?.referee.email} will be able to sign in again.`}
              {confirmAction?.type === 'reset-password' && `A new temporary password will be emailed to ${confirmAction?.referee.email}, and they will be asked to change it on next sign-in.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={suspendMutation.isPending || resetPasswordMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={suspendMutation.isPending || resetPasswordMutation.isPending}
              onClick={() => {
                if (!confirmAction) return;
                if (confirmAction.type === 'reset-password') resetPasswordMutation.mutate(confirmAction.referee.id);
                else suspendMutation.mutate(confirmAction.referee.id);
              }}
              className={confirmAction?.type === 'suspend' ? 'bg-red-600 text-white hover:bg-red-700' : undefined}
            >
              {confirmAction?.type === 'suspend' && 'Suspend account'}
              {confirmAction?.type === 'reactivate' && 'Reactivate account'}
              {confirmAction?.type === 'reset-password' && 'Reset password'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
