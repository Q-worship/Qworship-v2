import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
// removed duplicate line
import { useAuthStore } from "@/features/auth/auth.store";
import { AuthDuplicateEmailModal } from "@/features/auth/components/AuthDuplicateEmailModal";
import { AuthErrorModal } from "@/features/auth/components/AuthErrorModal";
import { AuthMarketingCarousel } from "@/features/auth/components/AuthMarketingCarousel";
import { AuthSignInForm } from "@/features/auth/components/AuthSignInForm";
import { AuthSignUpForm } from "@/features/auth/components/AuthSignUpForm";
import qWorshipLogoLarge from "@assets/Group 1_1753835537799.png";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function DesktopAuthRemote() {
  const [, setLocation] = useLocation();
  const [isSignUp, setIsSignUp] = useState(false);
  const { toast } = useToast();
  const [showDuplicateEmailModal, setShowDuplicateEmailModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalContent, setErrorModalContent] = useState({
    title: "", message: "", type: "", 
  });
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [signUpData, setSignUpData] = useState({
    firstName: "", lastName: "", countryCode: "+44", phoneNumber: "", email: "", password: "", agreeToMarketing: false,
  });

  const handleDesktopAuthPipeline = (user: any, token: string) => {
    // If the user already has an organization configured, deep-link immediately
    if (user.organizationId || user.organizationName || user.organization) {
      toast({
        title: "Authenticated!",
        description: "Redirecting you back to Qworship Desktop...",
      });
      const userPayload = encodeURIComponent(JSON.stringify(user));
      window.location.href = `qworship://auth?token=${token}&user=${userPayload}`;
    } else {
      // NEW USER/NO ORG: We must route them to the web organization setup first.
      // We store the session tokens they'll need for the final handoff at PlanSelection / Checkout
      sessionStorage.setItem("desktop_auth_pipeline", "true");
      sessionStorage.setItem("desktop_auth_token", token);
      sessionStorage.setItem("qworship_user_data", JSON.stringify(user));
      if (user?.id) sessionStorage.setItem("qworship_user_id", user.id.toString());
      
      // Update global Zustand store so `<AuthGuard>` doesn't immediately bounce us out!
      localStorage.setItem("token", token);
      useAuthStore.getState().setAuth(user);
      
      toast({
        title: "Authentication Successful",
        description: "Let's set up your organization before returning to the desktop app.",
      });
      setLocation("/organization-setup");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignUpInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSignUpData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const [isPending, setIsPending] = useState(false);
  const [isSignUpPending, setIsSignUpPending] = useState(false);

  const handleSignIn = async (data: typeof formData) => {
    setIsPending(true);
    setShowErrorModal(false);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${baseUrl}/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: data.username, password: data.password })
      });
      const json = await response.json();
      
      if (!response.ok || !json.success) {
        throw new Error(json.message || "Invalid credentials");
      }
      
      handleDesktopAuthPipeline(json.user, json.token);
    } catch (error: any) {
      console.error("🔥 DESKTOP AUTH PIPELINE CRASHED:", error);
      setErrorModalContent({
        title: "Sign-in Failed",
        message: "Network Error: " + (error?.message || "Unknown error occurred"),
        type: "invalid-credentials",
      });
      setShowErrorModal(true);
    } finally {
      setIsPending(false);
    }
  };

  const handleSignUpData = async (data: typeof signUpData) => {
    setIsSignUpPending(true);
    setShowErrorModal(false);
    try {
      const userData = {
        username: data.email, email: data.email, password: data.password,
        firstName: data.firstName, lastName: data.lastName, countryCode: data.countryCode,
        phoneNumber: data.phoneNumber, agreeToMarketing: data.agreeToMarketing,
        role: "user", accountType: "free", isActive: true, emailVerified: false,
      };
      
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      const json = await response.json();
      
      if (!response.ok || !json.success) {
        throw new Error(json.message || "Failed to create account");
      }
      
      handleDesktopAuthPipeline(json.user, json.token);
    } catch (error: any) {
      toast({ title: "Sign-up Failed", description: "There was an error creating your account. Please try again.", variant: "destructive" });
    } finally {
      setIsSignUpPending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.password.trim()) {
      setErrorModalContent({ title: "Missing Information", message: "Please enter your credentials.", type: "empty-fields" });
      setShowErrorModal(true);
      return;
    }
    handleSignIn(formData);
  };

  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpData.firstName || !signUpData.email || !signUpData.password) return;
    handleSignUpData(signUpData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#5A4B7C] via-[#6B5B95] to-[#7B6BAE]">
      <div className="flex-1 flex items-center justify-center px-6 pt-24 pb-12">
        <div className="w-full max-w-6xl mx-auto">
          
          <div className="bg-gradient-to-r from-[#5A4B7C] via-[#6B5B95] to-[#7B6BAE] rounded-3xl p-0 overflow-hidden shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[600px]">
              <div className="bg-gradient-to-br from-[#4A4570] to-[#6B5B95] p-12 flex flex-col justify-center">
                <div className="max-w-md mx-auto w-full">
                  {!isSignUp ? (
                    <AuthSignInForm
                      formData={formData} isPending={isPending}
                      onInputChange={handleInputChange} onSubmit={handleSubmit}
                      onSwitchToSignUp={() => setIsSignUp(true)}
                    />
                  ) : (
                    <AuthSignUpForm
                      signUpData={signUpData} isPending={isSignUpPending}
                      onInputChange={handleSignUpInputChange} onCountryCodeChange={(v) => setSignUpData((p) => ({ ...p, countryCode: v }))}
                      onCheckboxChange={(c) => setSignUpData((p) => ({ ...p, agreeToMarketing: c }))}
                      onSubmit={handleSignUpSubmit} onSwitchToSignIn={() => setIsSignUp(false)}
                    />
                  )}
                </div>
              </div>
              <AuthMarketingCarousel isSignUp={isSignUp} />
            </div>
          </div>
        </div>
      </div>
      <AuthErrorModal open={showErrorModal} onOpenChange={setShowErrorModal} title={errorModalContent.title} message={errorModalContent.message} type={errorModalContent.type} onTryAgain={() => setShowErrorModal(false)} />
    </div>
  );
}
