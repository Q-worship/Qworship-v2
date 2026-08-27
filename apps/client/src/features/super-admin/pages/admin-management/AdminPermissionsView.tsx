import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ADMIN_SECTION_GROUPS } from "@/features/super-admin/lib/adminSections";
import { Check, Minus, Shield } from "lucide-react";

interface RoleRow {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  adminCount: number;
}

interface AdminPermissionsViewProps {
  onManageRoles?: () => void;
}

export function AdminPermissionsView({ onManageRoles }: AdminPermissionsViewProps) {
  const { data, isLoading } = useQuery<{ success: boolean; roles: RoleRow[] }>({
    queryKey: ["/api/admin/roles"],
  });
  const roles = data?.roles || [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Permissions</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Every custom role and which sections it grants access to. Super Admin always has full access
            and is never restricted.
          </p>
        </div>
        {onManageRoles && (
          <Button variant="outline" onClick={onManageRoles}>
            Manage Roles
          </Button>
        )}
      </div>

      <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-gray-900 dark:text-white">
            <Shield className="w-4 h-4 text-red-500" />
            Super Admin
          </CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">Full access to every section — cannot be restricted.</p>
        </CardHeader>
      </Card>

      {isLoading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading roles...</p>
      ) : roles.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No custom roles yet. Create one under Custom Roles to control what admins can see.
        </p>
      ) : (
        roles.map((role) => (
          <Card key={role.id} className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-gray-900 dark:text-white">{role.name}</CardTitle>
                <Badge variant="outline">{role.adminCount} admin{role.adminCount === 1 ? "" : "s"}</Badge>
              </div>
              {role.description && <p className="text-sm text-gray-500 dark:text-gray-400">{role.description}</p>}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {ADMIN_SECTION_GROUPS.map((group) => (
                  <div key={group.section}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">{group.section}</p>
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const granted = role.permissions.includes(item.id);
                        return (
                          <div
                            key={item.id}
                            className={`flex items-center gap-2 text-sm ${granted ? "text-gray-800 dark:text-gray-100" : "text-gray-400 dark:text-gray-500"}`}
                          >
                            {granted ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Minus className="w-3.5 h-3.5" />}
                            {item.label}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
