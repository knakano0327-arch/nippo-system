"use client";

import { useCurrentUser } from "@/components/layout/UserProvider";
import {
  canCommentReport,
  canManageMaster,
  canReviewReport,
  isAdmin,
  isManager,
} from "@/lib/auth/permissions";

export function usePermissions() {
  const user = useCurrentUser();

  return {
    isManager: isManager(user),
    isAdmin: isAdmin(user),
    canComment: canCommentReport(user),
    canReview: canReviewReport(user),
    canManageMaster: canManageMaster(user),
    canViewReport: (report: { salespersonId: number }) =>
      user.id === report.salespersonId || isManager(user) || isAdmin(user),
    canEditReport: (report: { salespersonId: number; status: string }) =>
      user.id === report.salespersonId && report.status === "draft",
  };
}
