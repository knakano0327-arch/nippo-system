import type { JwtPayload } from "./jwt";

type UserLike = Pick<JwtPayload, "isManager" | "isAdmin">;

/** 上長かどうか */
export function isManager(user: UserLike): boolean {
  return user.isManager === true;
}

/** 管理者かどうか */
export function isAdmin(user: UserLike): boolean {
  return user.isAdmin === true;
}

/** 日報を閲覧できるか（本人 or 上長 or 管理者） */
export function canViewReport(
  user: UserLike & { sub: string },
  report: { salespersonId: number },
): boolean {
  return Number(user.sub) === report.salespersonId || isManager(user) || isAdmin(user);
}

/** 日報を編集できるか（本人かつ下書き） */
export function canEditReport(
  user: UserLike & { sub: string },
  report: { salespersonId: number; status: string },
): boolean {
  return Number(user.sub) === report.salespersonId && report.status === "draft";
}

/** 日報を削除できるか（本人かつ下書き — 編集と同じ条件） */
export const canDeleteReport = canEditReport;

/** 日報を確認済みにできるか（上長 or 管理者） */
export function canReviewReport(user: UserLike): boolean {
  return isManager(user) || isAdmin(user);
}

/** コメントを投稿できるか（上長 or 管理者） */
export function canCommentReport(user: UserLike): boolean {
  return isManager(user) || isAdmin(user);
}

/** 顧客・営業マスタを管理できるか（管理者のみ） */
export function canManageMaster(user: UserLike): boolean {
  return isAdmin(user);
}
