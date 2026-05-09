import { redirect } from "next/navigation";
import { ReportForm } from "@/components/reports/ReportForm";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function NewReportPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [user, customers] = await Promise.all([
    prisma.salesperson.findFirst({
      where: { id: Number(session.sub) },
      select: { name: true },
    }),
    prisma.customer.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!user) redirect("/login");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">日報作成</h1>
      <ReportForm authorName={user.name} customers={customers} />
    </div>
  );
}
