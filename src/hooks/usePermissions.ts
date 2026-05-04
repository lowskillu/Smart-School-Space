import { useSchool } from "@/contexts/SchoolContext";

export function usePermissions() {
  const { permissions, role } = useSchool();

  const hasPermission = (permission: string) => {
    if (role === 'admin') return true;
    return permissions.includes(permission);
  };

  const hasAnyPermission = (perms: string[]) => {
    if (role === 'admin') return true;
    return perms.some(p => permissions.includes(p));
  };

  const hasAllPermissions = (perms: string[]) => {
    if (role === 'admin') return true;
    return perms.every(p => permissions.includes(p));
  };

  return { 
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions,
    permissions,
    role
  };
}
