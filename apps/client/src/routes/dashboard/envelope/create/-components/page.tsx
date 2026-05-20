import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { FullBleedPageHeader } from "@/src/lib/components/app/chrome/full-bleed-page-header";
import Logo from "@/src/lib/components/app/chrome/logo";
import { Button } from "@/src/lib/components/ui/button";
import { UserDropdown } from "@/src/routes/dashboard/_shell/-components/user-dropdown";
import { useCreateEnvelope } from "@/src/routes/dashboard/envelope/create/-lib/context/create-envelope-context";
import { EnvelopeFormBody } from "./envelope-form-body";

export function CreateEnvelopePage() {
	const { form, handleSubmitAttempt } = useCreateEnvelope();

	return (
		<div className="min-h-screen bg-background">
			<FullBleedPageHeader>
				<div className="flex gap-4 items-center">
					<Logo
						className="px-0"
						textClassName="text-foreground font-bold"
						iconOnly
					/>
					<h3>Create New Document</h3>
				</div>
				<UserDropdown />
			</FullBleedPageHeader>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					handleSubmitAttempt();
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
					className="flex justify-end px-8 pb-8 mx-auto max-w-4xl gap-4"
				>
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
						disabled={form.state.isSubmitting}
					>
						{form.state.isSubmitting ? "Submitting..." : "Next Step"}
					</Button>
				</motion.div>
			</form>
		</div>
	);
}
