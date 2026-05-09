"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Building2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "./UserProvider";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "日報一覧", icon: <BookOpen className="size-4" /> },
  {
    href: "/master/customers",
    label: "顧客マスタ",
    icon: <Building2 className="size-4" />,
    adminOnly: true,
  },
  {
    href: "/master/salespersons",
    label: "営業マスタ",
    icon: <Users className="size-4" />,
    adminOnly: true,
  },
];

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { isManager } = useCurrentUser();

  const visible = NAV_ITEMS.filter((item) => !item.adminOnly || isManager);

  return (
    <nav className="flex flex-col gap-1 p-4">
      <p className="text-muted-foreground mb-2 px-2 text-xs font-semibold tracking-wider uppercase">
        メニュー
      </p>
      {visible.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
