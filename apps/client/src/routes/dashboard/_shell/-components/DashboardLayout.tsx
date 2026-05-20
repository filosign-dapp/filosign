import { SidebarInset, SidebarProvider } from "@/src/lib/components/ui/sidebar";
import { TooltipProvider } from "@/src/lib/components/ui/tooltip";
import DashboardNav from "./-components/dashboard-nav";
import { DashboardSidebar } from "./-components/dashboard-sidebar";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<TooltipProvider delay={200}>
			<SidebarProvider defaultOpen>
				<DashboardSidebar />
				<SidebarInset className="flex min-h-svh w-full flex-col bg-background">
					<DashboardNav />
					<section
						id="dashboard-content"
						className="flex flex-1 flex-col gap-4"
					>
						{children}
					</section>
				</SidebarInset>
			</SidebarProvider>
		</TooltipProvider>
	);
}
