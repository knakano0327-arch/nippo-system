import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { UserProvider } from "@/components/layout/UserProvider";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.salesperson.findFirst({
    where: { id: Number(session.sub), deletedAt: null },
    select: { id: true, name: true, email: true, isManager: true },
  });
  if (!user) redirect("/login");

  return (
    <UserProvider user={user}>
      <div className="bg-background flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </div>
    </UserProvider>
  );
}
