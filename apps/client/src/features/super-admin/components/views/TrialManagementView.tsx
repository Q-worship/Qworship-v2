import { apiRequest } from "@/lib/queryClient";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertTriangle,
  Search,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  PlusCircle,
  RefreshCw,
  Crown,
  Zap,
  Shield,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TrialManagementViewProps {
  isDarkMode: boolean;
  themeClasses: any;
  dateRange: string;
  adminKey: string;
}

interface SubscriptionUser {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  organizationName?: string;
  role?: string;
  accountType?: string;
  planType?: string;
  trialStartDate?: string;
  trialEndDate?: string;
  trialStatus?: string;
  subscriptionStatus?: string;
  computedStatus: string;
  daysRemaining: number;
  createdAt: string;
}

export const TrialManagementView: React.FC<TrialManagementViewProps> = ({
  isDarkMode,
  themeClasses,
  dateRange,
  adminKey,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Selected User for Modals
  const [selectedUser, setSelectedUser] = useState<SubscriptionUser | null>(null);

  // Multi-select Row State
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Extend Deadline Modal State (Single User)
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number>(30);
  const [customDate, setCustomDate] = useState<string>("");
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [notifyUserOnExtend, setNotifyUserOnExtend] = useState(true);

  // Bulk Extend Modal State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkTarget, setBulkTarget] = useState<"all_expired" | "by_tier" | "selected_users">("all_expired");
  const [bulkPlanType, setBulkPlanType] = useState<string>("cloud_pro");
  const [bulkDays, setBulkDays] = useState<number>(30);
  const [bulkCustomDate, setBulkCustomDate] = useState<string>("");
  const [bulkUseCustomDate, setBulkUseCustomDate] = useState(false);
  const [bulkNotifyUsers, setBulkNotifyUsers] = useState(false);

  // Change Plan / Status Modal State
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [newPlanType, setNewPlanType] = useState<string>("cloud_pro");
  const [newSubscriptionStatus, setNewSubscriptionStatus] = useState<string>("trial");
  const [newTrialStatus, setNewTrialStatus] = useState<string>("active");

  // Fetch Live Trial Analytics
  const {
    data: trialAnalytics,
    isLoading: analyticsLoading,
    refetch: refetchAnalytics,
  } = useQuery({
    queryKey: ["/api/admin/trial-analytics", dateRange],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/admin/trial-analytics?dateRange=${dateRange}&adminKey=${adminKey}`
      );
      if (!response.ok) throw new Error("Failed to fetch trial analytics");
      return response.json();
    },
  });

  // Fetch Paginated Subscription Users
  const {
    data: usersData,
    isLoading: usersLoading,
    isFetching: usersFetching,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: [
      "/api/admin/subscriptions/users",
      currentPage,
      searchTerm,
      statusFilter,
      planFilter,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
        search: searchTerm,
        status: statusFilter,
        plan: planFilter,
        adminKey,
      });
      const response = await apiRequest(
        "GET",
        `/api/admin/subscriptions/users?${params.toString()}`
      );
      if (!response.ok) throw new Error("Failed to fetch subscription users");
      return response.json();
    },
  });

  // Mutation: Bulk Extend Trials
  const bulkExtendMutation = useMutation({
    mutationFn: async ({
      target,
      planType,
      userIds,
      days,
      targetDate,
      notifyUsers,
    }: {
      target: "all_expired" | "by_tier" | "selected_users";
      planType?: string;
      userIds?: string[];
      days?: number;
      targetDate?: string;
      notifyUsers: boolean;
    }) => {
      const response = await apiRequest(
        "POST",
        `/api/admin/subscriptions/bulk-extend?adminKey=${adminKey}`,
        { target, planType, userIds, days, targetDate, notifyUsers }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to perform bulk extension");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Bulk Extension Complete",
        description: data.message || "Subscriptions updated successfully.",
      });
      setShowBulkModal(false);
      setSelectedUserIds([]);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscriptions/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trial-analytics"] });
    },
    onError: (err: any) => {
      toast({
        title: "Bulk Extension Failed",
        description: err.message || "Could not complete bulk operation.",
        variant: "destructive",
      });
    },
  });

  // Mutation: Extend Trial (Single)
  const extendTrialMutation = useMutation({
    mutationFn: async ({
      userId,
      days,
      targetDate,
      notifyUser,
    }: {
      userId: string;
      days?: number;
      targetDate?: string;
      notifyUser: boolean;
    }) => {
      const response = await apiRequest(
        "POST",
        `/api/admin/subscriptions/users/${userId}/extend?adminKey=${adminKey}`,
        { days, targetDate, notifyUser }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to extend trial");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Deadline Extended",
        description:
          data.message || "User subscription trial has been extended successfully.",
      });
      setShowExtendModal(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscriptions/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trial-analytics"] });
    },
    onError: (err: any) => {
      toast({
        title: "Extension Failed",
        description: err.message || "Could not extend trial deadline.",
        variant: "destructive",
      });
    },
  });

  // Mutation: Update Plan & Status
  const updatePlanMutation = useMutation({
    mutationFn: async ({
      userId,
      planType,
      subscriptionStatus,
      trialStatus,
    }: {
      userId: string;
      planType: string;
      subscriptionStatus: string;
      trialStatus: string;
    }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/admin/subscriptions/users/${userId}/plan?adminKey=${adminKey}`,
        {
          planType,
          accountType: subscriptionStatus === "active" ? "paid" : "free",
          subscriptionStatus,
          trialStatus,
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update plan");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Plan Updated",
        description:
          data.message || "User plan and status have been updated.",
      });
      setShowPlanModal(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscriptions/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trial-analytics"] });
    },
    onError: (err: any) => {
      toast({
        title: "Update Failed",
        description: err.message || "Could not update user plan.",
        variant: "destructive",
      });
    },
  });

  // Open Extend Modal
  const handleOpenExtend = (user: SubscriptionUser) => {
    setSelectedUser(user);
    setSelectedDays(30);
    setUseCustomDate(false);
    setCustomDate("");
    setNotifyUserOnExtend(true);
    setShowExtendModal(true);
  };

  // Open Bulk Modal with specified preset target
  const handleOpenBulkModal = (target: "all_expired" | "by_tier" | "selected_users") => {
    setBulkTarget(target);
    setBulkDays(30);
    setBulkUseCustomDate(false);
    setBulkCustomDate("");
    setBulkNotifyUsers(false);
    setShowBulkModal(true);
  };

  // Row selection helpers
  const handleToggleSelectUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleToggleSelectAll = () => {
    if (usersList.length === 0) return;
    const allCurrentPageIds = usersList.map((u) => u._id);
    const allSelected = allCurrentPageIds.every((id) => selectedUserIds.includes(id));
    if (allSelected) {
      setSelectedUserIds((prev) => prev.filter((id) => !allCurrentPageIds.includes(id)));
    } else {
      setSelectedUserIds((prev) => Array.from(new Set([...prev, ...allCurrentPageIds])));
    }
  };

  // Open Plan Modal
  const handleOpenPlanModal = (user: SubscriptionUser) => {
    setSelectedUser(user);
    setNewPlanType(user.planType || "cloud_pro");
    setNewSubscriptionStatus(user.subscriptionStatus || "trial");
    setNewTrialStatus(user.trialStatus || "active");
    setShowPlanModal(true);
  };

  // Confirm Single Extend
  const handleConfirmExtend = () => {
    if (!selectedUser) return;
    if (useCustomDate) {
      if (!customDate) {
        toast({
          title: "Select Target Date",
          description: "Please choose a valid future expiration date.",
          variant: "destructive",
        });
        return;
      }
      extendTrialMutation.mutate({
        userId: selectedUser._id,
        targetDate: new Date(customDate).toISOString(),
        notifyUser: notifyUserOnExtend,
      });
    } else {
      extendTrialMutation.mutate({
        userId: selectedUser._id,
        days: selectedDays,
        notifyUser: notifyUserOnExtend,
      });
    }
  };

  // Confirm Bulk Extend
  const handleConfirmBulkExtend = () => {
    if (bulkTarget === "selected_users" && selectedUserIds.length === 0) {
      toast({
        title: "No Users Selected",
        description: "Please select at least one user to extend.",
        variant: "destructive",
      });
      return;
    }

    if (bulkUseCustomDate) {
      if (!bulkCustomDate) {
        toast({
          title: "Select Target Date",
          description: "Please choose a valid future expiration date.",
          variant: "destructive",
        });
        return;
      }
      bulkExtendMutation.mutate({
        target: bulkTarget,
        planType: bulkPlanType,
        userIds: selectedUserIds,
        targetDate: new Date(bulkCustomDate).toISOString(),
        notifyUsers: bulkNotifyUsers,
      });
    } else {
      bulkExtendMutation.mutate({
        target: bulkTarget,
        planType: bulkPlanType,
        userIds: selectedUserIds,
        days: bulkDays,
        notifyUsers: bulkNotifyUsers,
      });
    }
  };

  // Calculate Computed Preview Date (Single)
  const getPreviewDate = () => {
    if (useCustomDate && customDate) {
      return new Date(customDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
    const now = new Date();
    const currentEnd =
      selectedUser?.trialEndDate && new Date(selectedUser.trialEndDate) > now
        ? new Date(selectedUser.trialEndDate)
        : now;
    const preview = new Date(
      currentEnd.getTime() + selectedDays * 24 * 60 * 60 * 1000
    );
    return preview.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Calculate Computed Preview Date (Bulk)
  const getBulkPreviewDate = () => {
    if (bulkUseCustomDate && bulkCustomDate) {
      return new Date(bulkCustomDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
    const now = new Date();
    const preview = new Date(now.getTime() + bulkDays * 24 * 60 * 60 * 1000);
    return preview.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getPlanBadge = (planType?: string) => {
    const plan = (planType || "cloud_pro").toLowerCase();
    if (plan.includes("enterprise")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-600/30 to-indigo-600/30 text-blue-300 border border-blue-500/40">
          <Shield className="w-3 h-3 text-blue-400" /> Enterprise
        </span>
      );
    }
    if (plan.includes("pro") || plan.includes("premium")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-600/30 to-pink-600/30 text-purple-300 border border-purple-500/40">
          <Zap className="w-3 h-3 text-purple-400" /> Cloud Pro
        </span>
      );
    }
    if (plan.includes("starter") || plan.includes("essential")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30">
          <Crown className="w-3 h-3 text-teal-400" /> Starter
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-500/20 text-gray-300 border border-gray-500/30">
        Free
      </span>
    );
  };

  const getStatusBadge = (user: SubscriptionUser) => {
    if (user.computedStatus === "active_paid") {
      return (
        <Badge className="bg-green-500/20 text-green-400 border border-green-500/40 hover:bg-green-500/30">
          <CheckCircle2 className="w-3 h-3 mr-1" /> Active Paid
        </Badge>
      );
    }
    if (user.computedStatus === "expired") {
      return (
        <Badge className="bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30">
          <XCircle className="w-3 h-3 mr-1" /> Expired
        </Badge>
      );
    }
    if (user.computedStatus === "cancelled") {
      return (
        <Badge className="bg-gray-500/20 text-gray-400 border border-gray-500/40">
          Cancelled
        </Badge>
      );
    }
    if (user.daysRemaining <= 3 && user.daysRemaining > 0) {
      return (
        <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
          <Clock className="w-3 h-3 mr-1" /> Expiring Soon ({user.daysRemaining}d)
        </Badge>
      );
    }
    return (
      <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/40">
        <Clock className="w-3 h-3 mr-1" /> Active Trial ({user.daysRemaining}d)
      </Badge>
    );
  };

  const usersList: SubscriptionUser[] = usersData?.users || [];
  const pagination = usersData?.pagination || { page: 1, totalPages: 1, total: 0 };
  const allCurrentPageSelected =
    usersList.length > 0 && usersList.every((u) => selectedUserIds.includes(u._id));

  return (
    <div className="space-y-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className={themeClasses.analyticsCard}>
          <CardHeader className="pb-2">
            <CardTitle className={`flex items-center gap-2 text-sm font-medium ${themeClasses.secondaryText}`}>
              <AlertTriangle className="h-4 w-4 text-orange-400" />
              Upcoming Expirations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-1">
            <div className="flex justify-between items-center text-sm">
              <span className={themeClasses.secondaryText}>Next 24h:</span>
              <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 font-semibold">
                {trialAnalytics?.upcomingExpirations?.today ?? 0}
              </Badge>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className={themeClasses.secondaryText}>Next 7 days:</span>
              <Badge className="bg-orange-500/20 text-orange-400 border border-orange-500/30 font-semibold">
                {trialAnalytics?.upcomingExpirations?.thisWeek ?? 0}
              </Badge>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className={themeClasses.secondaryText}>Next 30 days:</span>
              <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 font-semibold">
                {trialAnalytics?.upcomingExpirations?.thisMonth ?? 0}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className={themeClasses.analyticsCard}>
          <CardHeader className="pb-2">
            <CardTitle className={`flex items-center gap-2 text-sm font-medium ${themeClasses.secondaryText}`}>
              <Clock className="h-4 w-4 text-blue-400" />
              Active Trial Accounts
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <div className={`text-3xl font-bold ${themeClasses.primaryText}`}>
              {trialAnalytics?.activeTrials ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Standard 30-day trial period
            </p>
          </CardContent>
        </Card>

        <Card className={themeClasses.analyticsCard}>
          <CardHeader className="pb-2">
            <CardTitle className={`flex items-center gap-2 text-sm font-medium ${themeClasses.secondaryText}`}>
              <XCircle className="h-4 w-4 text-red-400" />
              Expired Trials
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <div className={`text-3xl font-bold ${themeClasses.primaryText}`}>
              {trialAnalytics?.expiredTrials ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Candidates for extension or reactivation
            </p>
          </CardContent>
        </Card>

        <Card className={themeClasses.analyticsCard}>
          <CardHeader className="pb-2">
            <CardTitle className={`flex items-center gap-2 text-sm font-medium ${themeClasses.secondaryText}`}>
              <UserCheck className="h-4 w-4 text-green-400" />
              Conversion Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-1">
            <div className="flex justify-between items-center">
              <span className={`text-2xl font-bold ${themeClasses.primaryText}`}>
                {trialAnalytics?.trialConversionRate ?? 0}%
              </span>
              <span className="text-xs text-muted-foreground">
                {trialAnalytics?.convertedUsers ?? 0} converted
              </span>
            </div>
            <div className={`w-full rounded-full h-2 ${themeClasses.progressBackground}`}>
              <div
                className={`h-2 rounded-full bg-gradient-to-r from-blue-500 to-green-500`}
                style={{ width: `${Math.min(100, trialAnalytics?.trialConversionRate || 0)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Users Management Table Card */}
      <Card className={themeClasses.analyticsCard}>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div>
            <CardTitle className={`text-xl font-bold ${themeClasses.primaryText} flex items-center gap-2`}>
              <Sparkles className="w-5 h-5 text-purple-400" />
              Subscription & Trial Directory
            </CardTitle>
            <CardDescription className="mt-1">
              Manage user tiers, dynamically increase deadlines, and perform bulk extensions.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Bulk Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-purple-500/40 text-purple-300 hover:bg-purple-500/10 text-xs font-semibold"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  Bulk Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-[#180e2d] border-purple-500/30 text-white">
                <DropdownMenuLabel>Batch Subscription Tools</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  onClick={() => handleOpenBulkModal("all_expired")}
                  className="gap-2 cursor-pointer text-xs hover:bg-white/10"
                >
                  <XCircle className="w-4 h-4 text-red-400" />
                  Extend All Expired Users...
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleOpenBulkModal("by_tier")}
                  className="gap-2 cursor-pointer text-xs hover:bg-white/10"
                >
                  <Zap className="w-4 h-4 text-purple-400" />
                  Extend by Plan Tier...
                </DropdownMenuItem>
                {selectedUserIds.length > 0 && (
                  <>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem
                      onClick={() => handleOpenBulkModal("selected_users")}
                      className="gap-2 cursor-pointer text-xs text-green-400 font-semibold hover:bg-white/10"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Extend Selected ({selectedUserIds.length} Users)...
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchUsers();
                refetchAnalytics();
              }}
              disabled={usersFetching}
              className="gap-2 border-border/50 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${usersFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>

        {/* Filter Toolbar */}
        <CardContent className="pt-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full max-w-md">
              <Search className={`absolute left-3 top-2.5 h-4 w-4 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`} />
              <Input
                placeholder="Search by name, email, or organization..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className={`pl-9 ${themeClasses.inputBackground}`}
              />
            </div>

            <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className={`w-40 ${themeClasses.selectBackground}`}>
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent className={themeClasses.selectContent}>
                  <SelectItem value="all" className={themeClasses.selectItem}>All Statuses</SelectItem>
                  <SelectItem value="active_trial" className={themeClasses.selectItem}>Active Trials</SelectItem>
                  <SelectItem value="expiring_soon" className={themeClasses.selectItem}>Expiring Soon</SelectItem>
                  <SelectItem value="expired" className={themeClasses.selectItem}>Expired</SelectItem>
                  <SelectItem value="paid" className={themeClasses.selectItem}>Active Paid</SelectItem>
                  <SelectItem value="cancelled" className={themeClasses.selectItem}>Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={planFilter}
                onValueChange={(val) => {
                  setPlanFilter(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className={`w-36 ${themeClasses.selectBackground}`}>
                  <SelectValue placeholder="Filter Plan" />
                </SelectTrigger>
                <SelectContent className={themeClasses.selectContent}>
                  <SelectItem value="all" className={themeClasses.selectItem}>All Plans</SelectItem>
                  <SelectItem value="free" className={themeClasses.selectItem}>Free</SelectItem>
                  <SelectItem value="starter" className={themeClasses.selectItem}>Starter</SelectItem>
                  <SelectItem value="essential" className={themeClasses.selectItem}>Essential</SelectItem>
                  <SelectItem value="cloud_pro" className={themeClasses.selectItem}>Cloud Pro</SelectItem>
                  <SelectItem value="professional" className={themeClasses.selectItem}>Professional</SelectItem>
                  <SelectItem value="enterprise" className={themeClasses.selectItem}>Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-border/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-muted-foreground uppercase text-[11px] tracking-wider border-b border-border/40">
                  <tr>
                    <th className="py-3.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={allCurrentPageSelected}
                        onChange={handleToggleSelectAll}
                        className="rounded border-white/20 bg-white/10 text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                    </th>
                    <th className="py-3.5 px-4 font-semibold">User</th>
                    <th className="py-3.5 px-4 font-semibold">Current Tier</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold">Trial Period</th>
                    <th className="py-3.5 px-4 font-semibold">Deadline & Remaining</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {usersLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-5 h-5 animate-spin text-purple-400" />
                          <span>Loading subscribers...</span>
                        </div>
                      </td>
                    </tr>
                  ) : usersList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        No users matching the criteria found.
                      </td>
                    </tr>
                  ) : (
                    usersList.map((user) => {
                      const isSelected = selectedUserIds.includes(user._id);
                      return (
                        <tr
                          key={user._id}
                          className={`hover:bg-muted/20 transition-colors ${
                            isSelected ? "bg-purple-500/10" : ""
                          }`}
                        >
                          {/* Row Checkbox */}
                          <td className="py-3.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectUser(user._id)}
                              className="rounded border-white/20 bg-white/10 text-purple-600 focus:ring-purple-500 cursor-pointer"
                            />
                          </td>

                          {/* User Profile */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center font-bold text-xs text-purple-300">
                                {user.firstName?.[0] || user.email[0].toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium text-foreground">
                                  {user.firstName
                                    ? `${user.firstName} ${user.lastName || ""}`
                                    : user.email.split("@")[0]}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {user.email}
                                </div>
                                {user.organizationName && (
                                  <div className="text-[11px] text-purple-400/80 font-medium">
                                    {user.organizationName}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Current Tier */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {getPlanBadge(user.planType)}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {getStatusBadge(user)}
                          </td>

                          {/* Trial Period */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-muted-foreground/70" />
                              <span>{formatDate(user.trialStartDate || user.createdAt)}</span>
                            </div>
                          </td>

                          {/* Deadline & Remaining */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1 max-w-[180px]">
                              <div className="flex justify-between text-xs">
                                <span className="font-medium text-foreground">
                                  {formatDate(user.trialEndDate)}
                                </span>
                                <span className="text-muted-foreground text-[11px]">
                                  {user.computedStatus === "expired"
                                    ? "Ended"
                                    : `${user.daysRemaining} days left`}
                                </span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    user.computedStatus === "expired"
                                      ? "bg-red-500"
                                      : user.daysRemaining <= 3
                                      ? "bg-amber-500"
                                      : "bg-gradient-to-r from-purple-500 to-blue-500"
                                  }`}
                                  style={{
                                    width: `${Math.max(
                                      5,
                                      Math.min(100, (user.daysRemaining / 30) * 100)
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenExtend(user)}
                                className="h-8 gap-1.5 text-xs border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                              >
                                <PlusCircle className="w-3.5 h-3.5" />
                                Extend
                              </Button>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 bg-[#1a0f2e] border-purple-500/30 text-white">
                                  <DropdownMenuLabel>User Subscription</DropdownMenuLabel>
                                  <DropdownMenuSeparator className="bg-white/10" />
                                  <DropdownMenuItem
                                    onClick={() => handleOpenExtend(user)}
                                    className="gap-2 cursor-pointer hover:bg-white/10"
                                  >
                                    <Clock className="w-4 h-4 text-blue-400" />
                                    Extend Deadline...
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleOpenPlanModal(user)}
                                    className="gap-2 cursor-pointer hover:bg-white/10"
                                  >
                                    <SlidersHorizontal className="w-4 h-4 text-purple-400" />
                                    Change Tier / Status
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/40 bg-muted/20 text-xs">
              <span className="text-muted-foreground">
                Showing {usersList.length} of {pagination.total} subscribers
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1 || usersLoading}
                  className="h-7 px-2"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <span className="text-muted-foreground">
                  Page {currentPage} of {pagination.totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={currentPage >= pagination.totalPages || usersLoading}
                  className="h-7 px-2"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Floating Selection Bar (when users are checked) */}
      {selectedUserIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-[#1a0f2e] border border-purple-500/40 rounded-full px-5 py-2.5 shadow-2xl flex items-center gap-4 text-white">
          <span className="text-xs font-semibold text-purple-300">
            {selectedUserIds.length} user(s) selected
          </span>
          <div className="h-4 w-px bg-white/20" />
          <Button
            size="sm"
            onClick={() => handleOpenBulkModal("selected_users")}
            className="h-7 px-3 bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5 font-medium rounded-full"
          >
            <Sparkles className="w-3 h-3" />
            Extend Selected
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedUserIds([])}
            className="h-7 px-2 text-xs text-gray-400 hover:text-white rounded-full"
          >
            Deselect All
          </Button>
        </div>
      )}

      {/* ── MODAL: Single User Extend Trial Deadline ── */}
      <Dialog open={showExtendModal} onOpenChange={setShowExtendModal}>
        <DialogContent className="max-w-lg bg-[#140b24] border-purple-500/30 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
              <Clock className="w-5 h-5 text-purple-400" />
              Extend Tier Deadline
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              Dynamically add trial days or set a specific expiration date for{" "}
              <span className="font-semibold text-white">
                {selectedUser?.firstName
                  ? `${selectedUser.firstName} ${selectedUser.lastName || ""}`
                  : selectedUser?.email}
              </span>
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-5 py-2">
              {/* User Snapshot */}
              <div className="p-3 bg-white/5 rounded-lg border border-white/10 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Current Plan:</span>
                  <span className="font-semibold text-purple-300 capitalize">
                    {selectedUser.planType || "Cloud Pro"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Current Deadline:</span>
                  <span className="font-medium text-white">
                    {formatDate(selectedUser.trialEndDate)} (
                    {selectedUser.computedStatus === "expired"
                      ? "Expired"
                      : `${selectedUser.daysRemaining} days left`}
                    )
                  </span>
                </div>
              </div>

              {/* Mode Toggle */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={!useCustomDate ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUseCustomDate(false)}
                  className={!useCustomDate ? "bg-purple-600 hover:bg-purple-700 text-white flex-1" : "border-white/20 text-gray-300 flex-1"}
                >
                  Quick Presets
                </Button>
                <Button
                  type="button"
                  variant={useCustomDate ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUseCustomDate(true)}
                  className={useCustomDate ? "bg-purple-600 hover:bg-purple-700 text-white flex-1" : "border-white/20 text-gray-300 flex-1"}
                >
                  Specific Date Picker
                </Button>
              </div>

              {!useCustomDate ? (
                <div className="space-y-2">
                  <Label className="text-xs text-gray-300 font-medium">
                    Add Days from Current Expiration:
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {[7, 14, 30, 60].map((days) => (
                      <Button
                        key={days}
                        type="button"
                        variant={selectedDays === days ? "default" : "outline"}
                        onClick={() => setSelectedDays(days)}
                        className={
                          selectedDays === days
                            ? "bg-purple-600 hover:bg-purple-700 text-white border-purple-500 font-bold"
                            : "border-white/20 text-gray-300 hover:bg-white/10"
                        }
                      >
                        +{days} Days
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-xs text-gray-300 font-medium">
                    Set Exact Expiration Date:
                  </Label>
                  <Input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              )}

              {/* Preview Ribbon */}
              <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg flex items-center justify-between text-xs">
                <span className="text-purple-300 font-medium flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  New Expiration Date:
                </span>
                <span className="font-bold text-white text-sm">
                  {getPreviewDate()}
                </span>
              </div>

              {/* Notification Checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="notifyUser"
                  checked={notifyUserOnExtend}
                  onChange={(e) => setNotifyUserOnExtend(e.target.checked)}
                  className="rounded border-white/20 bg-white/10 text-purple-600 focus:ring-purple-500"
                />
                <Label htmlFor="notifyUser" className="text-xs text-gray-300 cursor-pointer">
                  Send notification email to user confirming their extension
                </Label>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowExtendModal(false)}
              className="border-white/20 text-gray-300 hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmExtend}
              disabled={extendTrialMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
            >
              {extendTrialMutation.isPending ? "Extending..." : "Confirm Extension"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: Bulk Extend Subscriptions ── */}
      <Dialog open={showBulkModal} onOpenChange={setShowBulkModal}>
        <DialogContent className="max-w-lg bg-[#140b24] border-purple-500/30 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Bulk Extend Subscriptions
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              Extend subscription trial deadlines across multiple accounts at once.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Target Scope Selection */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-300 font-medium">Select Target Scope:</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={bulkTarget === "all_expired" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBulkTarget("all_expired")}
                  className={
                    bulkTarget === "all_expired"
                      ? "bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs"
                      : "border-white/20 text-gray-300 hover:bg-white/10 text-xs"
                  }
                >
                  All Expired ({trialAnalytics?.expiredTrials ?? 0})
                </Button>
                <Button
                  type="button"
                  variant={bulkTarget === "by_tier" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBulkTarget("by_tier")}
                  className={
                    bulkTarget === "by_tier"
                      ? "bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs"
                      : "border-white/20 text-gray-300 hover:bg-white/10 text-xs"
                  }
                >
                  By Plan Tier
                </Button>
                <Button
                  type="button"
                  variant={bulkTarget === "selected_users" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBulkTarget("selected_users")}
                  className={
                    bulkTarget === "selected_users"
                      ? "bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs"
                      : "border-white/20 text-gray-300 hover:bg-white/10 text-xs"
                  }
                >
                  Selected ({selectedUserIds.length})
                </Button>
              </div>
            </div>

            {/* If target is By Plan Tier, show tier selector */}
            {bulkTarget === "by_tier" && (
              <div className="space-y-2">
                <Label className="text-xs text-gray-300 font-medium">Choose Plan Tier to Extend:</Label>
                <Select value={bulkPlanType} onValueChange={setBulkPlanType}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a0f2e] border-purple-500/30 text-white">
                    <SelectItem value="free">Free Tier</SelectItem>
                    <SelectItem value="starter">Starter Plan</SelectItem>
                    <SelectItem value="essential">Essential Plan</SelectItem>
                    <SelectItem value="cloud_pro">Cloud Pro</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Mode Toggle */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={!bulkUseCustomDate ? "default" : "outline"}
                size="sm"
                onClick={() => setBulkUseCustomDate(false)}
                className={!bulkUseCustomDate ? "bg-purple-600 hover:bg-purple-700 text-white flex-1" : "border-white/20 text-gray-300 flex-1"}
              >
                Quick Days Preset
              </Button>
              <Button
                type="button"
                variant={bulkUseCustomDate ? "default" : "outline"}
                size="sm"
                onClick={() => setBulkUseCustomDate(true)}
                className={bulkUseCustomDate ? "bg-purple-600 hover:bg-purple-700 text-white flex-1" : "border-white/20 text-gray-300 flex-1"}
              >
                Specific Target Date
              </Button>
            </div>

            {!bulkUseCustomDate ? (
              <div className="space-y-2">
                <Label className="text-xs text-gray-300 font-medium">
                  Add Extension Duration:
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  {[7, 14, 30, 60].map((days) => (
                    <Button
                      key={days}
                      type="button"
                      variant={bulkDays === days ? "default" : "outline"}
                      onClick={() => setBulkDays(days)}
                      className={
                        bulkDays === days
                          ? "bg-purple-600 hover:bg-purple-700 text-white border-purple-500 font-bold"
                          : "border-white/20 text-gray-300 hover:bg-white/10"
                      }
                    >
                      +{days} Days
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-xs text-gray-300 font-medium">
                  Set Exact Expiration Date for All:
                </Label>
                <Input
                  type="date"
                  value={bulkCustomDate}
                  onChange={(e) => setBulkCustomDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
            )}

            {/* Scope Summary Preview */}
            <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-purple-300 font-medium">Targeted Group:</span>
                <span className="font-bold text-white capitalize">
                  {bulkTarget === "all_expired"
                    ? `All Expired Users (~${trialAnalytics?.expiredTrials ?? 0})`
                    : bulkTarget === "by_tier"
                    ? `All users on ${bulkPlanType}`
                    : `${selectedUserIds.length} checked users`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-300 font-medium">New Deadline (from now):</span>
                <span className="font-bold text-white">
                  {getBulkPreviewDate()}
                </span>
              </div>
            </div>

            {/* Notification Checkbox */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="bulkNotifyUsers"
                checked={bulkNotifyUsers}
                onChange={(e) => setBulkNotifyUsers(e.target.checked)}
                className="rounded border-white/20 bg-white/10 text-purple-600 focus:ring-purple-500"
              />
              <Label htmlFor="bulkNotifyUsers" className="text-xs text-gray-300 cursor-pointer">
                Send confirmation email notifications to affected users
              </Label>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowBulkModal(false)}
              className="border-white/20 text-gray-300 hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmBulkExtend}
              disabled={bulkExtendMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
            >
              {bulkExtendMutation.isPending ? "Executing Bulk Update..." : "Execute Bulk Extension"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: Change Plan Tier / Override Status ── */}
      <Dialog open={showPlanModal} onOpenChange={setShowPlanModal}>
        <DialogContent className="max-w-lg bg-[#140b24] border-purple-500/30 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
              <SlidersHorizontal className="w-5 h-5 text-purple-400" />
              Change Tier Plan & Status
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              Override plan tier level or subscription status for{" "}
              <span className="font-semibold text-white">
                {selectedUser?.firstName
                  ? `${selectedUser.firstName} ${selectedUser.lastName || ""}`
                  : selectedUser?.email}
              </span>
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-xs text-gray-300 font-medium">Select Plan Tier</Label>
                <Select value={newPlanType} onValueChange={setNewPlanType}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a0f2e] border-purple-500/30 text-white">
                    <SelectItem value="free">Free Tier</SelectItem>
                    <SelectItem value="starter">Starter Plan</SelectItem>
                    <SelectItem value="essential">Essential Plan</SelectItem>
                    <SelectItem value="cloud_pro">Cloud Pro</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-gray-300 font-medium">Subscription Status</Label>
                <Select value={newSubscriptionStatus} onValueChange={setNewSubscriptionStatus}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a0f2e] border-purple-500/30 text-white">
                    <SelectItem value="trial">Trial Period</SelectItem>
                    <SelectItem value="active">Active (Paid Account)</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-gray-300 font-medium">Trial Status Override</Label>
                <Select value={newTrialStatus} onValueChange={setNewTrialStatus}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a0f2e] border-purple-500/30 text-white">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="converted">Converted (Paid)</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="not_started">Not Started</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowPlanModal(false)}
              className="border-white/20 text-gray-300 hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedUser) return;
                updatePlanMutation.mutate({
                  userId: selectedUser._id,
                  planType: newPlanType,
                  subscriptionStatus: newSubscriptionStatus,
                  trialStatus: newTrialStatus,
                });
              }}
              disabled={updatePlanMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
            >
              {updatePlanMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
