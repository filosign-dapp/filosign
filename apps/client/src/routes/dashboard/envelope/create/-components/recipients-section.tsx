import { CaretDownIcon, UserIcon, UsersIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/src/lib/components/ui/collapsible";
import { DisabledTooltip } from "@/src/lib/components/ui/disabled-tooltip";
import { Label } from "@/src/lib/components/ui/label";
import { Switch } from "@/src/lib/components/ui/switch";
import { ProFeatureMark } from "@/src/lib/domains/entitlements/pro-feature-mark";
import { cn } from "@/src/lib/utils/utils";
import {
	RecipientsProvider,
	useRecipientsContext,
} from "@/src/routes/dashboard/envelope/create/-lib/context/recipients-context";
import { RecipientList } from "./recipient-list";

function RecipientsSectionContent() {
	const {
		recipients,
		error,
		showError,
		addRecipient,
		turnOrderEnabled,
		setTurnOrderEnabled,
		selfSignEnabled,
		setSelfSignEnabled,
		selfSignProfileEmail,
	} = useRecipientsContext();
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
						<Button
							type="button"
							className="group/add-recipients -my-2 flex w-full text-primary h-12 cursor-pointer items-center justify-between rounded-md border-0 bg-transparent p-2 text-left transition-colors hover:bg-accent/50"
						/>
					}
				>
					<h4 className="flex items-center gap-3">
						<UsersIcon
							className="size-5 text-muted-foreground"
							weight="regular"
						/>
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
							<div className="flex items-center gap-2 rounded-lg bg-background/50 px-3 py-1.5">
								<Switch
									id="self-sign-enabled-recipients"
									checked={selfSignEnabled}
									onCheckedChange={setSelfSignEnabled}
									disabled={!selfSignProfileEmail}
								/>
								<Label
									htmlFor="self-sign-enabled-recipients"
									className="cursor-pointer text-sm font-medium"
								>
									I also need to sign
								</Label>
							</div>

							<div className="flex shrink-0 flex-wrap items-center gap-3 sm:justify-end">
								<DisabledTooltip
									disabled={recipients.length === 0}
									reason="Add at least one recipient first."
									side="top"
								>
									<div className="flex items-center gap-2 rounded-large">
										<Switch
											id="turn-order-enabled-recipients"
											checked={turnOrderEnabled}
											onCheckedChange={setTurnOrderEnabled}
											disabled={recipients.length === 0}
										/>
										<Label
											htmlFor="turn-order-enabled-recipients"
											className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium"
										>
											Ordered Signing
											<ProFeatureMark size="xs" />
										</Label>
									</div>
								</DisabledTooltip>

								<Button
									type="button"
									variant="default"
									size="sm"
									onClick={addRecipient}
								>
									<UserIcon className="size-4" weight="regular" />
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
									damping: 25,
									delay: 0.1,
								}}
							>
								<div className="space-y-6">
									<motion.div
										className="flex justify-center"
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										transition={{
											type: "spring",
											stiffness: 230,
											damping: 25,
											delay: 0.2,
										}}
									>
										<div className="rounded-full bg-muted p-6">
											<UsersIcon
												className="h-12 w-12 text-primary"
												weight="regular"
											/>
										</div>
									</motion.div>
									<motion.div
										className="space-y-2"
										initial={{ opacity: 0, y: 10 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{
											type: "spring",
											stiffness: 230,
											damping: 25,
											delay: 0.3,
										}}
									>
										<p className="text-muted-foreground">No recipients yet</p>
										<p className="text-sm text-muted-foreground">
											Add someone who needs to sign or view.
										</p>
									</motion.div>
								</div>
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
