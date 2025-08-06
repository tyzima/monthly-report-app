import { Suspense } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { GlobalHeader } from "@/components/global-header";
import MockupsContent from "./mockups-content";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

export default function MockupsPage() {
  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      <AppSidebar />
      <SidebarInset>
        <GlobalHeader />
        <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          <Suspense fallback={<DashboardSkeleton />}>
            <MockupsContent />
          </Suspense>
        </main>
      </SidebarInset>
    </div>
  );
}
