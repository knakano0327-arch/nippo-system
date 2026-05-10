"use client";

import { useCurrentUser } from "@/components/layout/UserProvider";
import {
  canCommentReport,
  canEditReport,
  canManageMaster,
  canReviewReport,
  canViewReport,
  isAdmin,
  isManager,
} from "@/lib/auth/permissions";

export function usePermissions() {
  const user = useCurrentUser();
  // permissions.ts functions expect { sub: string } for ownership checks;
  // adapt from the frontend user shape which uses { id: number }.
  const userWithSub = { ...user, sub: String(user.id) };

  return {
    isManager: isManager(user),
    isAdmin: isAdmin(user),
    canComment: canCommentReport(user),
    canReview: canReviewReport(user),
    canManageMaster: canManageMaster(user),
    canViewReport: (report: { salespersonId: number }) => canViewReport(userWithSub, report),
    canEditReport: (report: { salespersonId: number; status: string }) =>
      canEditReport(userWithSub, report),
  };
}
