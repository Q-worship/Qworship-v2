import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ADMIN_SECTION_GROUPS } from "@/features/super-admin/lib/adminSections";
import { Plus, Lock, Trash2, Users as UsersIcon } from "lucide-react";

interface RoleRow {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  adminCount: number;
}

interface AdminAccountRow {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  roleId: string | null;
}

export function AdminCustomRolesView() {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [assignedAdminIds, setAssignedAdminIds] = useState<Set<string>>(new Set());
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const { data: rolesData, isLoading: rolesLoading } = useQuery<{ success: boolean; roles: RoleRow[] }>({
    queryKey: ["/api/admin/roles"],
  });
  const roles = rolesData?.roles || [];

  const { data: adminAccounts } = useQuery<AdminAccountRow[]>({
    queryKey: ["/api/admin/accounts"],
  });
  const restrictedAdmins = (adminAccounts || []).filter((a) => a.role === "admin");

  useEffect(() => {
    if (editingId === "new") {
      setName("");
      setDescription("");
      setPermissions(new Set());
      setAssignedAdminIds(new Set());
    } else if (editingId) {
      const role = roles.find((r) => r.id === editingId);
      if (role) {
        setName(role.name);
        setDescription(role.description || "");
        setPermissions(new Set(role.permissions));
        setAssignedAdminIds(new Set(restrictedAdmins.filter((a) => a.roleId === role.id).map((a) => a.id)));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = { name: name.trim(), description: description.trim(), permissions: [...permissions] };
      const response =
        editingId === "new"
          ? await apiRequest("POST", "/api/admin/roles", body)
          : await apiRequest("PATCH", `/api/admin/roles/${editingId}`, body);
      const result = await response.json();
      const roleId = result.role?._id || result.role?.id || editingId;

      const previouslyAssigned = new Set(restrictedAdmins.filter((a) => a.roleId === roleId).map((a) => a.id));
      const toAssign = [...assignedAdminIds].filter((id) => !previouslyAssigned.has(id));
      const toUnassign = [...previouslyAssigned].filter((id) => !assignedAdminIds.has(id));
      await Promise.all([
        ...toAssign.map((id) => apiRequest("PATCH", `/api/admin/accounts/${id}/role`, { roleId })),
        ...toUnassign.map((id) => apiRequest("PATCH", `/api/admin/accounts/${id}/role`, { roleId: null })),
      ]);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
      queryClient.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/admin/accounts") });
      toast({ title: "Role saved", description: `"${name.trim()}" has been saved.` });
      setEditingId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Couldn't save role",
        description: error?.message?.replace(/^\d+:\s*/, "") || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (reassignTo?: "null") => {
      const query = reassignTo ? `?reassignTo=${reassignTo}` : "";
      const response = await apiRequest("DELETE", `/api/admin/roles/${pendingDeleteId}${query}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
      queryClient.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/admin/accounts") });
      toast({ title: "Role deleted" });
      setPendingDeleteId(null);
    },
    onError: async (error: any) => {
      const message = error?.message || "";
      if (message.startsWith("409")) {
        // Still in use - the delete button below already surfaces the reassign confirmation.
        return;
      }
      toast({ title: "Couldn't delete role", description: message.replace(/^\d+:\s*/, ""), variant: "destructive" });
      setPendingDeleteId(null);
    },
  });

  const togglePermission = (id: string, checked: boolean) => {
    setPermissions((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleGroup = (groupItemIds: string[], checked: boolean) => {
    setPermissions((prev) => {
      const next = new Set(prev);
      groupItemIds.forEach((id) => (checked ? next.add(id) : next.delete(id)));
      return next;
    });
  };

  if (editingId) {
    return (
      <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">
            {editingId === "new" ? "New Role" : `Edit Role: ${name}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4 max-w-2xl">
            <div>
              <Label htmlFor="roleName">Role name</Label>
              <Input id="roleName" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="roleDescription">Description</Label>
              <Input id="roleDescription" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" />
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Permissions — sections this role can see</h4>
            <div className="grid grid-cols-2 gap-4">
              {ADMIN_SECTION_GROUPS.map((group) => {
                const groupIds = group.items.map((i) => i.id);
                const allChecked = groupIds.every((id) => permissions.has(id));
                return (
                  <div key={group.section} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{group.section}</span>
                      <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
                        <Checkbox checked={allChecked} onCheckedChange={(c) => toggleGroup(groupIds, !!c)} />
                        Select all
                      </label>
                    </div>
                    <div className="space-y-1.5">
                      {group.items.map((item) => (
                        <label key={item.id} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                          <Checkbox checked={permissions.has(item.id)} onCheckedChange={(c) => togglePermission(item.id, !!c)} />
                          {item.label}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <UsersIcon className="w-4 h-4" />
              Assigned Admins
            </h4>
            {restrictedAdmins.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No admin accounts yet. Create one from Add New User.</p>
            ) : (
              <div className="space-y-1.5">
                {restrictedAdmins.map((admin) => (
                  <label key={admin.id} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                    <Checkbox
                      checked={assignedAdminIds.has(admin.id)}
                      onCheckedChange={(c) =>
                        setAssignedAdminIds((prev) => {
                          const next = new Set(prev);
                          if (c) next.add(admin.id);
                          else next.delete(admin.id);
                          return next;
                        })
                      }
                    />
                    {admin.firstName} {admin.lastName} ({admin.email})
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button onClick={() => saveMutation.mutate()} disabled={!name.trim() || saveMutation.isPending} className="bg-purple-600 hover:bg-purple-700 text-white">
              {saveMutation.isPending ? "Saving..." : "Save Role"}
            </Button>
            <Button variant="outline" onClick={() => setEditingId(null)}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Custom Roles</h3>
        <Button onClick={() => setEditingId("new")} className="bg-purple-600 hover:bg-purple-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          New Role
        </Button>
      </div>

      {rolesLoading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading roles...</p>
      ) : roles.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No custom roles yet. Create one to start assigning granular admin access.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {roles.map((role) => (
            <Card key={role.id} className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-gray-900 dark:text-white flex items-center gap-2">
                    {role.name}
                    {role.isSystem && <Lock className="w-3.5 h-3.5 text-gray-400" />}
                  </CardTitle>
                  <Badge variant="outline">{role.adminCount} admin{role.adminCount === 1 ? "" : "s"}</Badge>
                </div>
                {role.description && <p className="text-sm text-gray-500 dark:text-gray-400">{role.description}</p>}
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1 mb-3">
                  {role.permissions.length === 0 ? (
                    <span className="text-xs text-gray-400">No sections granted</span>
                  ) : (
                    role.permissions.map((permId) => (
                      <Badge key={permId} variant="outline" className="text-xs">
                        {permId}
                      </Badge>
                    ))
                  )}
                </div>
                {!role.isSystem && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditingId(role.id)}>
                      Edit
                    </Button>
                    {pendingDeleteId === role.id ? (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500 dark:text-gray-400">
                          {role.adminCount > 0 ? `Unassign ${role.adminCount} admin(s) and delete?` : "Delete this role?"}
                        </span>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteMutation.mutate(role.adminCount > 0 ? "null" : undefined)}
                        >
                          Confirm
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setPendingDeleteId(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" className="text-red-600" onClick={() => setPendingDeleteId(role.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
