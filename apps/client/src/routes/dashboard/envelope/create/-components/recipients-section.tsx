import { CaretDownIcon, UsersIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/src/lib/components/ui/collapsible";
import { cn } from "@/src/lib/utils/utils";
import {
	RecipientsProvider,
	useRecipientsContext,
} from "@/src/routes/dashboard/envelope/create/-lib/context/recipients-context";
import { RecipientList } from "./recipient-list";

function RecipientsSectionContent() {
	const { recipients, error, showError, addRecipient } = useRecipientsContext();
	const [isRecipientsOpen, setIsRecipientsOpen] = useState(true);

	return (
		<motion.section
			className="space-y-4"
			initial={{ opacity: 0, y: 30 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{
				type: "spring",
				stiffness: 200,
				damping: 25,
				delay: 0.4,
			}}
		>
			<Collapsible open={isRecipientsOpen} onOpenChange={setIsRecipientsOpen}>
				<CollapsibleTrigger
					render={
						<button
							type="button"
							className="group/add-recipients -m-2 flex w-full cursor-pointer items-center justify-between rounded-lg border-0 bg-transparent p-2 text-left transition-colors hover:bg-muted/40"
						/>
					}
				>
					<h4 className="flex items-center gap-3 text-base font-semibold tracking-tight text-foreground">
						<span className="flex size-8 items-center justify-center rounded-md bg-muted/50 text-muted-foreground transition-colors group-hover/add-recipients:bg-muted/70">
							<UsersIcon className="size-4" weight="regular" />
						</span>
						Add recipients
					</h4>
					<CaretDownIcon
						className={cn(
							"size-4 text-muted-foreground transition-transform duration-200",
							isRecipientsOpen && "rotate-180",
						)}
						weight="bold"
					/>
				</CollapsibleTrigger>

				<CollapsibleContent className="mt-6">
					<div className="space-y-5">
						<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
							<div className="min-w-0 space-y-1">
								<p className="text-sm leading-relaxed text-muted-foreground">
									Add recipients by email.
								</p>
								{recipients && recipients.length > 0 ? (
									<p className="text-xs text-muted-foreground/80">
										{recipients.length} recipient
										{recipients.length !== 1 ? "s" : ""} added
									</p>
								) : null}
							</div>

							<div className="flex shrink-0 flex-wrap items-center gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="gap-1.5 border-border/60 bg-background text-foreground/90 shadow-none"
									onClick={addRecipient}
								>
									<UsersIcon className="size-4" weight="regular" />
									Add recipient
								</Button>
							</div>
						</div>

						{!recipients || recipients.length === 0 ? (
							<motion.div
								className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-8 py-12 text-center"
								initial={{ opacity: 0, y: 12 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{
									type: "spring",
									stiffness: 230,
									damping: 26,
								}}
							>
								<div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground">
									<UsersIcon className="size-6" weight="regular" />
								</div>
								<p className="text-sm font-medium text-foreground/90">
									No recipients added
								</p>
								<p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
									Click{" "}
									<span className="font-medium text-foreground/80">
										Add recipient
									</span>{" "}
									above, then enter their email.
								</p>
							</motion.div>
						) : (
							<RecipientList />
						)}

						{error && showError ? (
							<motion.p
								initial={{ opacity: 0, y: -6 }}
								animate={{ opacity: 1, y: 0 }}
								className="rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive"
							>
								{error}
							</motion.p>
						) : null}
					</div>
				</CollapsibleContent>
			</Collapsible>
		</motion.section>
	);
}

export default function RecipientsSection() {
	return (
		<RecipientsProvider>
			<RecipientsSectionContent />
		</RecipientsProvider>
	);
}
