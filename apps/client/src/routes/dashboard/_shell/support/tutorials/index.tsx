import { createFileRoute, Link } from "@tanstack/react-router";
import { buttonVariants } from "@/src/lib/components/ui/button";
import {
	activationEyebrowClassName,
	activationLeadClassName,
	activationTitleClassName,
} from "@/src/lib/domains/activation/copy";
import { ActivationTutorialsContent } from "@/src/lib/domains/activation/tutorials-content";

export const Route = createFileRoute("/dashboard/_shell/support/tutorials/")({
	component: ActivationTutorialsPage,
});

function ActivationTutorialsPage() {
	return (
		<div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8 md:py-10">
			<header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div className="space-y-2">
					<p className={activationEyebrowClassName}>Support</p>
					<h1 className={activationTitleClassName}>Tutorials</h1>
					<p className={`max-w-xl ${activationLeadClassName}`}>
						Guides for proof exports, plan features, and workflows after you
						finish the starter checklist.
					</p>
				</div>
				<Link
					to="/dashboard/support"
					className={buttonVariants({
						variant: "outline",
						size: "sm",
						className: "shrink-0 rounded-full",
					})}
				>
					Support Center
				</Link>
			</header>
			<ActivationTutorialsContent />
		</div>
	);
}
