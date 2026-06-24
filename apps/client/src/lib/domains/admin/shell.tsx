import { Outlet, useRouterState } from "@tanstack/react-router";
import { DeploymentBanner } from "@/src/lib/components/app/deployment-banner";
import { SidebarInset, SidebarProvider } from "@/src/lib/components/ui/sidebar";
import { TooltipProvider } from "@/src/lib/components/ui/tooltip";
import { AdminGate } from "@/src/lib/domains/admin/gate";
import { AdminNav } from "@/src/lib/domains/admin/nav-bar";
import { AdminSidebar } from "@/src/lib/domains/admin/sidebar";
import { SupportNavigationProvider } from "@/src/lib/errors/support-navigation-provider";

function isFullBleedAdminEditor(pathname: string): boolean {
	return (
		pathname.startsWith("/admin/system-templates/new") ||
		/^\/admin\/system-templates\/[^/]+\/edit/.test(pathname)
	);
}

export function AdminShell() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const fullBleed = isFullBleedAdminEditor(pathname);

	if (fullBleed) {
		return (
			<AdminGate layout="full">
				<Outlet />
			</AdminGate>
		);
	}

	return (
		<TooltipProvider delay={200}>
			<SupportNavigationProvider>
				<DeploymentBanner />
				<SidebarProvider defaultOpen>
					<AdminSidebar />
					<SidebarInset className="flex min-h-svh w-full flex-col bg-background">
						<AdminNav />
						<section
							id="admin-content"
							className="flex min-h-0 flex-1 flex-col gap-4"
						>
							<AdminGate layout="content">
								<Outlet />
							</AdminGate>
						</section>
					</SidebarInset>
				</SidebarProvider>
			</SupportNavigationProvider>
		</TooltipProvider>
	);
}
