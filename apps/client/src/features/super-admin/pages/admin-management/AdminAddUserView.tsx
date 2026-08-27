import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";

interface RoleOption {
  id: string;
  name: string;
  description: string;
}

interface AdminAddUserViewProps {
  onCreated: () => void;
}

export function AdminAddUserView({ onCreated }: AdminAddUserViewProps) {
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "superadmin">("admin");
  const [roleId, setRoleId] = useState<string>("none");

  const { data: rolesData } = useQuery<{ success: boolean; roles: RoleOption[] }>({
    queryKey: ["/api/admin/roles"],
  });
  const roles = rolesData?.roles || [];

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/accounts", {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        role,
        roleId: role === "admin" && roleId !== "none" ? roleId : null,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
      toast({
        title: "Account created",
        description: data.emailSent
          ? `Credentials emailed to ${email.trim()}.`
          : data.warning || "Account created, but the credentials email could not be sent.",
      });
      onCreated();
    },
    onError: (error: any) => {
      toast({
        title: "Couldn't create account",
        description: error?.message?.replace(/^\d+:\s*/, "") || "Please check the details and try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !email.trim()) {
      toast({ title: "Missing information", description: "First name and email are required.", variant: "destructive" });
      return;
    }
    createMutation.mutate();
  };

  return (
    <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          <UserPlus className="w-5 h-5" />
          Add New User
        </CardTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Creates an admin account and emails them a username (their email) and a system-generated
          password. They'll be required to set their own password on first login.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email (used as username)</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Account type</Label>
            <Select value={role} onValueChange={(value) => setRole(value as "admin" | "superadmin")}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="superadmin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {role === "admin" && (
            <div>
              <Label>Assign custom role</Label>
              <Select value={roleId} onValueChange={setRoleId}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No role yet — assign later</SelectItem>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                An admin with no role sees nothing until a role is assigned from Custom Roles.
              </p>
            </div>
          )}
          <Button type="submit" disabled={createMutation.isPending} className="bg-orange-500 hover:bg-orange-600 text-white">
            {createMutation.isPending ? "Creating..." : "Create Account & Send Invite"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
