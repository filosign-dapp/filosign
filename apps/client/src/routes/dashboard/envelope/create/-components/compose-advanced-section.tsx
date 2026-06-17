import { useEntitlements } from "@filosign/react/billing";
import {
	canUseAdvancedRouting,
	canUseBasicSettlements,
	canUseSupplementaryAttachments,
} from "@filosign/react/files";
import { CaretDownIcon, SlidersHorizontalIcon } from "@phosphor-icons/react";
import { useStore } from "@tanstack/react-form";
import { motion } from "motion/react";
import { type ReactNode, useEffect, useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/src/lib/components/ui/collapsible";
import { buildCreateForm } from "@/src/lib/domains/drafts";
import {
	useStorePersist,
	useStorePersistHydrated,
} from "@/src/lib/filosign/use-store";
import { cn } from "@/src/lib/utils/utils";
import { ComposePayoutsContent } from "@/src/routes/dashboard/envelope/create/-components/compose-payouts-section";
import { ComposeRoutingContent } from "@/src/routes/dashboard/envelope/create/-components/compose-routing-field";
import { ComposeSupplementaryFilesContent } from "@/src/routes/dashboard/envelope/create/-components/compose-supplementary-files-section";
import { useCreateEnvelope } from "@/src/routes/dashboard/envelope/create/-lib/context/create-envelope-context";
import { composeSectionEnterMotion } from "@/src/routes/dashboard/envelope/create/-lib/utils/compose-section-motion";

function AdvancedSubsection({
	children,
	first,
}: {
	children: ReactNode;
	first?: boolean;
}) {
	return (
		<div
			className={cn("space-y-3", !first && "border-t border-border/40 pt-8")}
		>
			{children}
		</div>
	);
}

export function ComposeAdvancedSection() {
	const { form } = useCreateEnvelope();
	const { data: entitlements, isPending: entitlementsPending } =
		useEntitlements();
	const createForm = useStorePersist((s) => s.createForm);
	const setCreateForm = useStorePersist((s) => s.setCreateForm);
	const persistHydrated = useStorePersistHydrated();
	const formValues = useStore(form.store, (state) => state.values);
	const recipients = formValues.recipients;
	const [isAdvancedOpen, setIsAdvancedOpen] = useState(true);

	const showRouting = canUseAdvancedRouting(entitlements);
	const showPayouts = canUseBasicSettlements(entitlements);
	const showFiles = canUseSupplementaryAttachments(entitlements);
	const hasAdvancedFeatures = showRouting || showPayouts || showFiles;

	useEffect(() => {
		if (!persistHydrated || recipients.length === 0 || createForm) return;

		void buildCreateForm(formValues, useStorePersist.getState().createForm)
			.then(setCreateForm)
			.catch((error) => {
				console.error("Failed to bootstrap compose draft:", error);
			});
	}, [
		createForm,
		formValues,
		persistHydrated,
		recipients.length,
		setCreateForm,
	]);

	if (
		entitlementsPending ||
		!persistHydrated ||
		recipients.length === 0 ||
		!hasAdvancedFeatures
	) {
		return null;
	}

	const subsections: { key: string; node: ReactNode }[] = [];
	if (showRouting) {
		subsections.push({
			key: "routing",
			node: <ComposeRoutingContent recipients={recipients} />,
		});
	}
	if (showPayouts) {
		subsections.push({
			key: "payouts",
			node: <ComposePayoutsContent />,
		});
	}
	if (showFiles) {
		subsections.push({
			key: "files",
			node: <ComposeSupplementaryFilesContent recipients={recipients} />,
		});
	}

	return (
		<motion.section className="space-y-4" {...composeSectionEnterMotion()}>
			<Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
				<CollapsibleTrigger
					render={
						<Button
							type="button"
							className="group/advanced -my-2 flex h-12 w-full cursor-pointer items-center justify-between rounded-md border-0 bg-transparent p-2 text-left text-primary transition-colors hover:bg-accent/50"
						/>
					}
				>
					<h4 className="flex items-center gap-3">
						<SlidersHorizontalIcon
							className="size-5 text-muted-foreground"
							weight="regular"
						/>
						Advanced
					</h4>
					<CaretDownIcon
						className={cn(
							"size-4 text-muted-foreground transition-transform duration-200",
							isAdvancedOpen && "rotate-180",
						)}
						weight="bold"
					/>
				</CollapsibleTrigger>

				<CollapsibleContent className="mt-6 space-y-8">
					{subsections.map(({ key, node }, index) => (
						<AdvancedSubsection key={key} first={index === 0}>
							{node}
						</AdvancedSubsection>
					))}
				</CollapsibleContent>
			</Collapsible>
		</motion.section>
	);
}
