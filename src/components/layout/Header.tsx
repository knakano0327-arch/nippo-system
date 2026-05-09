"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SidebarContent } from "./SidebarContent";
import { useCurrentUser } from "./UserProvider";

export function Header() {
  const router = useRouter();
  const { name, isManager } = useCurrentUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <header className="bg-card border-border sticky top-0 z-40 flex h-14 items-center gap-3 border-b px-4">
      {/* mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="メニューを開く"
      >
        <Menu className="size-5" />
      </Button>

      <span className="text-foreground font-semibold tracking-tight">営業日報システム</span>

      <div className="ml-auto flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm leading-none font-medium">{name}</p>
          <p className="text-muted-foreground text-xs">{isManager ? "上長・管理者" : "営業"}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          disabled={loggingOut}
          aria-label="ログアウト"
        >
          <LogOut className="size-4" />
        </Button>
      </div>

      {/* mobile sidebar sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-56 p-0">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="text-sm">営業日報システム</SheetTitle>
          </SheetHeader>
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  );
}
