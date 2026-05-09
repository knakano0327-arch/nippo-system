import { SidebarContent } from "./SidebarContent";

export function Sidebar() {
  return (
    <aside className="bg-card border-border hidden w-56 shrink-0 border-r lg:block">
      <SidebarContent />
    </aside>
  );
}
