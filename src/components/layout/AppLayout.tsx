import { useState, type ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
  /** إخفاء الحاوية الافتراضية (للصفحات ذات التخطيط الخاص مثل المشاهدة) */
  bare?: boolean;
}

export function AppLayout({ children, bare = false }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header
        onMenuToggle={() => {
          setSidebarOpen((v) => !v);
          setCollapsed((v) => !v);
        }}
      />
      <Sidebar
        isOpen={sidebarOpen}
        collapsed={collapsed}
        onClose={() => setSidebarOpen(false)}
      />

      <main
        className={cn(
          "pt-14 pb-16 transition-[padding] duration-300 md:pb-0",
          collapsed ? "lg:ps-[72px]" : "lg:ps-60"
        )}
      >
        {bare ? (
          children
        ) : (
          <div className="mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-4 sm:py-6">
            {children}
          </div>
        )}
      </main>

      <MobileNav />
    </div>
  );
}

export function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="flex shrink-0 gap-2">{action}</div>}
    </div>
  );
}
