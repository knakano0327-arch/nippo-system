"use client";

import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  page: number;
  totalPages: number;
  searchParams: Record<string, string>;
};

export function DashboardPagination({ page, totalPages, searchParams }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function navigate(newPage: number) {
    const params = new URLSearchParams({ ...searchParams, page: String(newPage) });
    router.push(`${pathname}?${params.toString()}`);
  }

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-4">
      <Button variant="outline" size="sm" onClick={() => navigate(page - 1)} disabled={page <= 1}>
        <ChevronLeft className="h-4 w-4" />
        前へ
      </Button>
      <span className="text-muted-foreground text-sm">
        {page} / {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate(page + 1)}
        disabled={page >= totalPages}
      >
        次へ
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
