import { useFilosignContext } from "@filosign/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button } from "@/src/lib/components/ui/button";
import { Loader } from "@/src/lib/components/ui/loader";
import { cn } from "@/src/lib/utils";

export function AdminGate({
	children,
	layout = "full",
}: {
	children: React.ReactNode;
	layout?: "full" | "content";
}) {
	const { rpcQuery } = useFilosignContext();

	const accessQuery = useQuery({
		...rpcQuery.platformAdmin.access.queryOptions(),
		retry: false,
	});

	if (accessQuery.isPending) {
		if (layout === "content") {
			return (
				<div className="flex flex-1 items-center justify-center py-24">
					<Loader text="Checking access…" />
				</div>
			);
		}

		return (
			<div className="flex min-h-svh items-center justify-center">
				<Loader text="Checking access…" />
			</div>
		);
	}

	if (accessQuery.data?.isAdmin !== true) {
		if (layout === "content") {
			return (
				<div
					className={cn(
						"mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center",
					)}
				>
					<div className="space-y-2">
						<h1 className="text-2xl font-semibold tracking-tight">
							Access Restricted
						</h1>
						<p className="text-pretty text-sm text-muted-foreground">
							This area is restricted to platform admins.
						</p>
					</div>
					<Button
						variant="outline"
						size="sm"
						render={<Link to="/dashboard/document/all" />}
					>
						Back to dashboard
					</Button>
				</div>
			);
		}

		return (
			<div className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-6 px-6 py-16 text-center">
				<div className="space-y-2">
					<h1 className="text-2xl font-semibold tracking-tight">
						Access Restricted
					</h1>
					<p className="text-pretty text-sm text-muted-foreground">
						This area is restricted to platform admins.
					</p>
				</div>
				<Button
					variant="outline"
					size="sm"
					render={<Link to="/dashboard/document/all" />}
				>
					Back to dashboard
				</Button>
			</div>
		);
	}

	return <>{children}</>;
}
