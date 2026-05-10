import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { CustomerForm } from "@/components/master/CustomerForm";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditCustomerPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.isAdmin) redirect("/");

  const { id } = await params;
  const customerId = Number(id);
  if (!Number.isInteger(customerId) || customerId <= 0) notFound();

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, deletedAt: null },
  });
  if (!customer) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">顧客編集</h1>
      <div className="max-w-lg">
        <CustomerForm
          customerId={customer.id}
          initialValues={{
            name: customer.name,
            industry: customer.industry,
            phone: customer.phone,
            address: customer.address,
          }}
        />
      </div>
    </div>
  );
}
