import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { SalespersonForm } from "@/components/master/SalespersonForm";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditSalespersonPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.isManager) redirect("/");

  const { id } = await params;
  const salespersonId = Number(id);
  if (!Number.isInteger(salespersonId) || salespersonId <= 0) notFound();

  const salesperson = await prisma.salesperson.findFirst({
    where: { id: salespersonId, deletedAt: null },
  });
  if (!salesperson) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">営業編集</h1>
      <div className="max-w-lg">
        <SalespersonForm
          salespersonId={salesperson.id}
          initialValues={{
            name: salesperson.name,
            email: salesperson.email,
            department: salesperson.department,
            is_manager: salesperson.isManager,
          }}
        />
      </div>
    </div>
  );
}
