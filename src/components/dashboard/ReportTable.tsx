import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MessageSquare } from "lucide-react";

type Report = {
  id: number;
  salesperson_id: number;
  salesperson_name: string;
  report_date: string;
  status: "draft" | "submitted" | "reviewed";
  visit_count: number;
  has_comment: boolean;
};

type Props = {
  reports: Report[];
  currentUserId: number;
  isManager: boolean;
};

const STATUS_LABELS: Record<Report["status"], string> = {
  draft: "下書き",
  submitted: "提出済み",
  reviewed: "確認済み",
};

function StatusBadge({ status }: { status: Report["status"] }) {
  if (status === "draft") return <Badge variant="secondary">{STATUS_LABELS[status]}</Badge>;
  if (status === "reviewed")
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
        {STATUS_LABELS[status]}
      </Badge>
    );
  return <Badge>{STATUS_LABELS[status]}</Badge>;
}

export function ReportTable({ reports, currentUserId, isManager }: Props) {
  if (reports.length === 0) {
    return <p className="text-muted-foreground py-8 text-center text-sm">日報がありません</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>日付</TableHead>
          {isManager && <TableHead>担当者名</TableHead>}
          <TableHead className="text-center">訪問顧客数</TableHead>
          <TableHead>ステータス</TableHead>
          <TableHead className="text-center">コメント</TableHead>
          <TableHead>操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reports.map((report) => {
          const canEdit = report.salesperson_id === currentUserId && report.status === "draft";
          return (
            <TableRow key={report.id}>
              <TableCell>{report.report_date}</TableCell>
              {isManager && <TableCell>{report.salesperson_name}</TableCell>}
              <TableCell className="text-center">{report.visit_count}</TableCell>
              <TableCell>
                <StatusBadge status={report.status} />
              </TableCell>
              <TableCell className="text-center">
                {report.has_comment && (
                  <MessageSquare className="text-muted-foreground mx-auto h-4 w-4" />
                )}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/reports/${report.id}`}>閲覧</Link>
                  </Button>
                  {canEdit && (
                    <Button asChild size="sm">
                      <Link href={`/reports/${report.id}/edit`}>編集</Link>
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
