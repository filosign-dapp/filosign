import { CaretDownIcon, CheckIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { cn } from "../../lib/cn";
import {
	buildPricingComparisonRows,
	COMPARISON_PLAN_IDS,
	COMPARISON_PLAN_LABELS,
	type ComparisonCellValue,
	type ComparisonPlanId,
} from "../../lib/pricing-comparison";

const comparisonRows = buildPricingComparisonRows();

const DEFAULT_OPEN_PLAN: ComparisonPlanId = "teams";

function ComparisonCell({ value }: { value: ComparisonCellValue }) {
	if (value === true) {
		return (
			<CheckIcon className="size-5 text-foreground" weight="bold" aria-hidden />
		);
	}
	if (value === null) {
		return <span className="text-muted-foreground/30">—</span>;
	}
	return <span className="text-foreground font-medium">{value}</span>;
}

function PlanAccordionItem({
	planId,
	defaultOpen,
}: {
	planId: ComparisonPlanId;
	defaultOpen: boolean;
}) {
	const [open, setOpen] = useState(defaultOpen);
	const panelId = `comparison-${planId}`;
	const label = COMPARISON_PLAN_LABELS[planId];

	return (
		<div className="rounded-2xl border border-border/60 bg-muted/20 overflow-hidden">
			<button
				type="button"
				id={`${panelId}-trigger`}
				aria-expanded={open}
				aria-controls={panelId}
				onClick={() => setOpen((prev) => !prev)}
				className="flex w-full min-h-11 items-center justify-between gap-3 px-4 py-3 text-left font-manrope font-medium"
			>
				<span>{label}</span>
				<CaretDownIcon
					className={cn(
						"size-5 shrink-0 text-muted-foreground transition-transform duration-200",
						open && "rotate-180",
					)}
					aria-hidden
				/>
			</button>
			{open ? (
				<div
					id={panelId}
					role="region"
					aria-labelledby={`${panelId}-trigger`}
					className="border-t border-border/40 px-4 pb-4"
				>
					<dl className="space-y-0">
						{comparisonRows.map((row) => {
							if (row.kind === "section") {
								return (
									<div key={row.id} className="pt-4 pb-1 first:pt-2">
										<dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
											{row.label}
										</dt>
									</div>
								);
							}

							return (
								<div
									key={row.id}
									className="flex items-center justify-between gap-4 border-t border-border/30 py-3 first:border-t-0"
								>
									<dt className="text-sm text-muted-foreground">{row.label}</dt>
									<dd className="shrink-0 text-sm text-right">
										<ComparisonCell value={row.values[planId]} />
									</dd>
								</div>
							);
						})}
					</dl>
				</div>
			) : null}
		</div>
	);
}

/** Stacked plan accordions for viewports below lg. */
export default function ComparisonAccordion() {
	return (
		<section
			className="lg:hidden space-y-3"
			aria-label="Plan feature comparison"
		>
			{COMPARISON_PLAN_IDS.map((planId) => (
				<PlanAccordionItem
					key={planId}
					planId={planId}
					defaultOpen={planId === DEFAULT_OPEN_PLAN}
				/>
			))}
		</section>
	);
}
