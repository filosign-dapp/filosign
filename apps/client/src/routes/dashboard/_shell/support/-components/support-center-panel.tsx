import {
	SupportTopicBody,
	useSupportCenterPanel,
} from "@filosign/errors/client";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { AppEmptyState } from "@/src/lib/components/app/empty-state";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/src/lib/components/ui/accordion";
import { Input } from "@/src/lib/components/ui/input";
import { FEEDBACK_COPY } from "@/src/lib/copy/feedback";
import { useFeedback } from "@/src/lib/feedback/feedback-provider";

export type SupportCenterPanelProps = {
	showHeader?: boolean;
	title?: string;
	lead?: string;
	docsCrossLinkUrl?: string;
};

export function SupportCenterPanel({
	showHeader = true,
	title = "Support Center",
	lead = "Search for the message you see in the app, open the matching topic, and read what to do next.",
	docsCrossLinkUrl,
}: SupportCenterPanelProps) {
	const { query, setQuery, openSlug, setOpenSlug, grouped } =
		useSupportCenterPanel();
	const { openFeedback } = useFeedback();

	return (
		<div className="flex w-full flex-col gap-8">
			{showHeader ? (
				<header className="flex flex-col gap-2">
					<h1 className="text-2xl font-medium tracking-tight text-foreground">
						{title}
					</h1>
					<p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
						{lead}
					</p>
					<button
						type="button"
						className="w-fit text-left text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
						onClick={() => openFeedback()}
					>
						{FEEDBACK_COPY.supportLink}
					</button>
				</header>
			) : null}

			<div className="relative">
				<MagnifyingGlassIcon
					className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
					aria-hidden
				/>
				<Input
					type="search"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder="Search by error message or topic…"
					aria-label="Search support topics"
					className="pl-9"
				/>
			</div>

			{grouped.length === 0 ? (
				<AppEmptyState
					preset="section"
					variant="muted"
					icon={MagnifyingGlassIcon}
					title="No topics match that search"
					description="Try a few words from the exact error message you saw in the app."
				/>
			) : (
				grouped.map((group) => (
					<section
						key={group.category}
						className="flex flex-col gap-3"
						aria-labelledby={`support-${group.category}`}
					>
						<h2
							id={`support-${group.category}`}
							className="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
						>
							{group.category}
						</h2>
						<Accordion
							value={
								openSlug &&
								group.items.some((item) => item.supportSlug === openSlug)
									? [openSlug]
									: []
							}
							onValueChange={(value) => {
								setOpenSlug(value[0] ?? null);
							}}
						>
							{group.items.map((entry) => (
								<AccordionItem
									key={entry.supportSlug}
									value={entry.supportSlug}
									id={entry.supportSlug}
									className="scroll-mt-24"
								>
									<AccordionTrigger>{entry.title}</AccordionTrigger>
									<AccordionContent>
										<SupportTopicBody
											description={entry.description}
											steps={entry.steps}
										/>
									</AccordionContent>
								</AccordionItem>
							))}
						</Accordion>
					</section>
				))
			)}

			<div className="border-t border-border flex w-full justify-between gap-4 pt-6 text-sm leading-relaxed text-muted-foreground">
				<p>
					Still need help? Email{" "}
					<a
						href="mailto:support@filosign.xyz"
						className="font-medium text-foreground underline underline-offset-4"
					>
						support@filosign.xyz
					</a>
				</p>
				{docsCrossLinkUrl ? (
					<>
						{" "}
						<a
							href={docsCrossLinkUrl}
							className="font-medium text-foreground underline underline-offset-4"
						>
							Browse all docs
						</a>
					</>
				) : null}
			</div>
		</div>
	);
}
