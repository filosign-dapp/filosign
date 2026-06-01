import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { FullBleedPageHeader } from "@/src/lib/components/app/chrome/full-bleed-page-header";
import Logo from "@/src/lib/components/app/chrome/logo";
import { Button } from "@/src/lib/components/ui/button";
import { UserDropdown } from "@/src/routes/dashboard/_shell/-components/user-dropdown";
import { useCreateEnvelope } from "@/src/routes/dashboard/envelope/create/-lib/context/create-envelope-context";
import { ClearEnvelopeFormButton } from "./clear-envelope-form-button";
import { EnvelopeFormBody } from "./envelope-form-body";

export function CreateEnvelopePage() {
	const { form, isAdvancing } = useCreateEnvelope();

	return (
		<div className="min-h-screen bg-background">
			<FullBleedPageHeader>
				<div className="flex gap-4 items-center">
					<Logo className="px-0" textClassName="text-foreground" iconOnly />
					<h3>New envelope</h3>
				</div>
				<UserDropdown />
			</FullBleedPageHeader>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					void form.handleSubmit();
				}}
			>
				<EnvelopeFormBody />

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						type: "spring",
						stiffness: 230,
						damping: 25,
						delay: 0.7,
					}}
					className="flex flex-wrap items-center justify-between gap-4 px-8 pb-8 mx-auto max-w-4xl"
				>
					<ClearEnvelopeFormButton />
					<div className="flex gap-4 ml-auto">
						<Button
							type="button"
							variant="ghost"
							size="lg"
							className="gap-2"
							render={<Link to="/dashboard" />}
						>
							Back
						</Button>
						<Button
							type="submit"
							variant="primary"
							size="lg"
							className="gap-2 group transition-all duration-200"
							disabled={isAdvancing}
						>
							{isAdvancing ? "Continuing…" : "Continue"}
						</Button>
					</div>
				</motion.div>
			</form>
		</div>
	);
}
