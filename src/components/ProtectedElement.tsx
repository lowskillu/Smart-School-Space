import React from "react";
import { useSchool } from "@/contexts/SchoolContext";

interface ProtectedElementProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component that hides its children if the current user doesn't have the required permission.
 */
export const ProtectedElement: React.FC<ProtectedElementProps> = ({
  permission,
  children,
  fallback = null,
}) => {
  const { permissions } = useSchool();

  // If permissions are not yet loaded or user doesn't have it, show fallback
  if (!permissions.includes(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
