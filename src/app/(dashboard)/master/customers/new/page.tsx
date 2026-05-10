import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { CustomerForm } from "@/components/master/CustomerForm";

export default async function NewCustomerPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.isAdmin) redirect("/");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">顧客登録</h1>
      <div className="max-w-lg">
        <CustomerForm />
      </div>
    </div>
  );
}
