import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CommentSection } from "@/components/reports/CommentSection";
import { ReportActions } from "@/components/reports/ReportActions";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

const STATUS_LABELS = { draft: "下書き", submitted: "提出済み", reviewed: "確認済み" } as const;

function StatusBadge({ status }: { status: "draft" | "submitted" | "reviewed" }) {
  if (status === "draft") return <Badge variant="secondary">{STATUS_LABELS[status]}</Badge>;
  if (status === "reviewed")
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
        {STATUS_LABELS[status]}
      </Badge>
    );
  return <Badge>{STATUS_LABELS[status]}</Badge>;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
}

function formatDateTime(d: Date): string {
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ReportDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const reportId = Number(id);
  if (!Number.isInteger(reportId) || reportId <= 0) notFound();

  const currentUserId = Number(session.sub);
  const isManager = session.isManager;

  const report = await prisma.dailyReport.findUnique({
    where: { id: reportId },
    include: {
      salesperson: { select: { name: true } },
      visitRecords: {
        include: { customer: { select: { name: true } } },
        orderBy: { sortOrder: "asc" },
      },
      comments: {
        include: { commenter: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!report) notFound();

  if (!isManager && report.salespersonId !== currentUserId) {
    redirect("/");
  }

  const comments = report.comments.map((c) => ({
    id: c.id,
    commenter_name: c.commenter.name,
    target_type: c.targetType as "problem" | "plan",
    content: c.content,
    created_at: c.createdAt.toISOString(),
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">日報詳細</h1>
        <StatusBadge status={report.status} />
      </div>

      {/* 基本情報 */}
      <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
        <div>
          <p className="text-muted-foreground mb-1 text-xs">日付</p>
          <p className="font-medium">{formatDate(report.reportDate)}</p>
        </div>
        <div>
          <p className="text-muted-foreground mb-1 text-xs">作成者</p>
          <p className="font-medium">{report.salesperson.name}</p>
        </div>
        <div>
          <p className="text-muted-foreground mb-1 text-xs">作成日時</p>
          <p className="text-sm">{formatDateTime(report.createdAt)}</p>
        </div>
        <div>
          <p className="text-muted-foreground mb-1 text-xs">更新日時</p>
          <p className="text-sm">{formatDateTime(report.updatedAt)}</p>
        </div>
      </div>

      <Separator />

      {/* 訪問記録 */}
      <div>
        <h2 className="mb-3 font-medium">訪問記録</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">No.</TableHead>
              <TableHead className="w-40">顧客名</TableHead>
              <TableHead>訪問内容</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.visitRecords.map((vr, index) => (
              <TableRow key={vr.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell className="font-medium">{vr.customer.name}</TableCell>
                <TableCell className="text-sm whitespace-pre-wrap">{vr.visitContent}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Separator />

      {/* Problem */}
      <div>
        <h2 className="mb-2 font-medium">Problem（今の課題・相談）</h2>
        {report.problem ? (
          <p className="text-sm whitespace-pre-wrap">{report.problem}</p>
        ) : (
          <p className="text-muted-foreground text-sm">記入なし</p>
        )}
      </div>

      {/* Plan */}
      <div>
        <h2 className="mb-2 font-medium">Plan（明日やること）</h2>
        {report.plan ? (
          <p className="text-sm whitespace-pre-wrap">{report.plan}</p>
        ) : (
          <p className="text-muted-foreground text-sm">記入なし</p>
        )}
      </div>

      <Separator />

      {/* コメント */}
      <CommentSection reportId={reportId} comments={comments} isManager={isManager} />

      <Separator />

      {/* アクションボタン */}
      <ReportActions
        reportId={reportId}
        status={report.status}
        salespersonId={report.salespersonId}
        currentUserId={currentUserId}
        isManager={isManager}
      />
    </div>
  );
}
