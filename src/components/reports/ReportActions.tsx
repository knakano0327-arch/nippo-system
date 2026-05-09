"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Props = {
  reportId: number;
  status: "draft" | "submitted" | "reviewed";
  salespersonId: number;
  currentUserId: number;
  isManager: boolean;
};

export function ReportActions({
  reportId,
  status,
  salespersonId,
  currentUserId,
  isManager,
}: Props) {
  const router = useRouter();
  const [isReviewing, setIsReviewing] = useState(false);

  const isOwn = salespersonId === currentUserId;
  const canEdit = isOwn && status === "draft";
  const canReview = isManager && status === "submitted";

  async function handleReview() {
    setIsReviewing(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "reviewed" }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setIsReviewing(false);
    }
  }

  return (
    <div className="flex gap-3">
      {canReview && (
        <Button onClick={handleReview} disabled={isReviewing}>
          確認済みにする
        </Button>
      )}
      {canEdit && (
        <Button asChild variant="outline">
          <Link href={`/reports/${reportId}/edit`}>編集</Link>
        </Button>
      )}
      <Button asChild variant="ghost">
        <Link href="/">一覧へ戻る</Link>
      </Button>
    </div>
  );
}
