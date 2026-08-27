import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/features/auth/auth.store";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function AdminForcePasswordChangePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const storedTempPassword = typeof window !== "undefined" ? sessionStorage.getItem("qworship_pending_temp_password") : null;
  const [currentPassword, setCurrentPassword] = useState(storedTempPassword || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/complete-first-login", {
        currentPassword,
        newPassword,
      });
      return await response.json();
    },
    onSuccess: (response) => {
      sessionStorage.removeItem("qworship_pending_temp_password");
      localStorage.setItem("token", response.token);
      useAuthStore.getState().setAuth(response.user);
      toast({
        title: "Password updated",
        description: "Your password has been changed. Welcome to the Super Admin Portal.",
      });
      setLocation(response.nextStep || "/super-admin");
    },
    onError: (error: any) => {
      toast({
        title: "Couldn't update password",
        description: error?.message?.replace(/^\d+:\s*/, "") || "Please check your current password and try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword.trim()) {
      toast({ title: "Missing current password", description: "Enter the temporary password you were issued.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Password too short", description: "Choose a password with at least 8 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Make sure both new password fields match.", variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-[#1d0d46] border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-white mb-2">Set a New Password</h1>
            <p className="text-white/60 text-sm">
              For security, choose your own password before continuing to the Super Admin Portal.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!storedTempPassword && (
              <div>
                <Label htmlFor="currentPassword" className="text-white text-sm font-medium mb-2 block">
                  Current (temporary) password
                </Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="bg-gray-600/50 border-gray-500 text-white placeholder:text-gray-300 focus:border-purple-400 focus:ring-purple-400 h-12"
                />
              </div>
            )}

            <div>
              <Label htmlFor="newPassword" className="text-white text-sm font-medium mb-2 block">
                New password
              </Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-gray-600/50 border-gray-500 text-white placeholder:text-gray-300 focus:border-purple-400 focus:ring-purple-400 h-12"
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-white text-sm font-medium mb-2 block">
                Confirm new password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-gray-600/50 border-gray-500 text-white placeholder:text-gray-300 focus:border-purple-400 focus:ring-purple-400 h-12"
              />
            </div>

            <Button
              type="submit"
              disabled={changePasswordMutation.isPending}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-3 rounded-lg font-semibold"
            >
              {changePasswordMutation.isPending ? "Updating..." : "Set Password & Continue"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
