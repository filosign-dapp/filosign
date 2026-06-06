import { createFileRoute, Link } from "@tanstack/react-router";
import { buttonVariants } from "@/src/lib/components/ui/button";
import { ActivationTutorialsContent } from "@/src/lib/domains/activation/tutorials-content";

export const Route = createFileRoute("/dashboard/_shell/support/tutorials/")({
	component: ActivationTutorialsPage,
});

function ActivationTutorialsPage() {
	return (
		<div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8 md:py-10">
			<header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div className="space-y-1">
					<h1 className="text-2xl font-medium tracking-tight text-foreground">
						Tutorials
					</h1>
					<p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
						Extended guides for proof packets, plan features, and sandbox notes
						after you finish the three starter steps.
					</p>
				</div>
				<Link
					to="/dashboard/support"
					className={buttonVariants({ variant: "outline", size: "sm" })}
				>
					Support Center
				</Link>
			</header>
			<ActivationTutorialsContent />
		</div>
	);
}
