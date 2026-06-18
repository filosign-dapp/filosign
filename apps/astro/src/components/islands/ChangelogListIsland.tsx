import type { ChangelogEntry } from "../../content/changelog";
import {
	CHANGELOG_CATEGORY_LABELS,
	CHANGELOG_ERAS,
	groupEntriesByEra,
} from "../../content/changelog";
import { cn } from "../../lib/cn";
import { MARKETING_CTA } from "../../lib/marketing-cta";
import { marketingSectionClass } from "../../lib/marketing-layout";
import { MarketingInViewStagger } from "./MarketingStagger";
import { MotionProvider } from "./MotionProvider";

function scrollToEra(eraId: string) {
	const el = document.getElementById(`changelog-era-${eraId}`);
	el?.scrollIntoView({ behavior: "smooth", block: "start" });
}

interface ChangelogListIslandProps {
	entries: ChangelogEntry[];
}

function EntryCard({ entry }: { entry: ChangelogEntry }) {
	return (
		<article
			id={`changelog-entry-${entry.id}`}
			className="group relative scroll-mt-32 rounded-2xl border border-border/60 bg-muted/10 p-5 transition-all duration-300 hover:border-border hover:bg-muted/20 md:p-6"
		>
			<div className="flex flex-wrap items-center gap-2 md:gap-3">
				<time className="font-manrope text-sm font-medium text-muted-foreground">
					{entry.date}
				</time>
				<span className="text-xs text-muted-foreground/40" aria-hidden>
					•
				</span>
				<span className="inline-flex items-center rounded-full border border-border/40 bg-muted/60 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
					{CHANGELOG_CATEGORY_LABELS[entry.category]}
				</span>
			</div>

			<h3 className="mt-3 font-manrope text-xl font-medium tracking-tight text-foreground md:text-2xl">
				{entry.title}
			</h3>

			<p className="mt-2 text-base leading-relaxed text-muted-foreground md:text-lg">
				{entry.description.join(" ")}
			</p>

			{entry.image ? (
				<div className="relative mt-4 aspect-video w-full overflow-hidden rounded-3xl bg-secondary">
					<img
						src={entry.image}
						alt={entry.title}
						className="relative inset-0 h-full w-full rounded-4xl object-cover p-4"
					/>
				</div>
			) : null}
		</article>
	);
}

export default function ChangelogListIsland({
	entries,
}: ChangelogListIslandProps) {
	const grouped = groupEntriesByEra(entries);

	return (
		<MotionProvider>
			<section
				id="changelog-timeline"
				className="scroll-mt-28 bg-background py-12 md:py-20"
			>
				<div className={marketingSectionClass}>
					<header className="mb-12 max-w-2xl md:mb-14">
						<h2 className="font-manrope text-2xl font-medium tracking-tight text-foreground md:text-3xl">
							What shipped, and when
						</h2>
						<p className="mt-3 font-manrope text-base leading-relaxed text-muted-foreground md:text-lg">
							Every item below is something you can use in the product today. We
							group by chapter so you can skim the last couple of months - from
							first send to team billing, one step at a time.
						</p>
					</header>

					<div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[1fr_22rem] lg:gap-16">
						<div className="min-w-0 space-y-14 md:space-y-16">
							{CHANGELOG_ERAS.map((era) => {
								const eraEntries = grouped.get(era.id) ?? [];
								if (eraEntries.length === 0) return null;

								return (
									<section
										key={era.id}
										id={`changelog-era-${era.id}`}
										className="scroll-mt-32"
									>
										<header className="mb-8 border-b border-border/40 pb-6">
											<p className="font-manrope text-sm font-medium text-primary">
												{era.subtitle}
											</p>
											<h3 className="mt-1 font-manrope text-2xl font-medium tracking-tight text-foreground md:text-3xl">
												{era.label}
											</h3>
											<p className="mt-2 max-w-2xl font-manrope text-base leading-relaxed text-muted-foreground">
												{era.description}
											</p>
										</header>

										<ol className="relative space-y-6">
											<div
												aria-hidden
												className="absolute top-2 bottom-2 left-[11px] hidden w-px bg-border/70 md:block"
											/>
											{eraEntries.map((entry) => (
												<li key={entry.id} className="relative md:pl-10">
													<span
														aria-hidden
														className="absolute left-0 top-6 hidden size-[22px] items-center justify-center rounded-full border border-border bg-background md:flex"
													>
														<span className="size-2 rounded-full bg-primary/80" />
													</span>
													<MarketingInViewStagger pace="page" maxVisible={8}>
														<EntryCard entry={entry} />
													</MarketingInViewStagger>
												</li>
											))}
										</ol>
									</section>
								);
							})}
						</div>

						<aside className="sticky top-28 hidden w-full space-y-8 self-start lg:block">
							<div className="rounded-2xl border border-border/60 bg-muted/10 p-6 backdrop-blur-sm">
								<h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
									Browse by chapter
								</h3>
								<div className="flex w-full flex-col items-start gap-2">
									{CHANGELOG_ERAS.map((era) => {
										const count = grouped.get(era.id)?.length ?? 0;
										if (count === 0) return null;

										return (
											<button
												key={era.id}
												type="button"
												onClick={() => scrollToEra(era.id)}
												className={cn(
													"flex w-full cursor-pointer items-center justify-between rounded-lg border border-border/50 bg-background px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground",
												)}
											>
												<span>{era.label}</span>
												<span className="text-xs tabular-nums text-muted-foreground/70">
													{count}
												</span>
											</button>
										);
									})}
								</div>
							</div>

							<div className="relative overflow-hidden rounded-2xl border border-foreground/5 bg-primary p-6 text-primary-foreground shadow-lg">
								<div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-emerald-500/25 blur-2xl" />
								<h3 className="relative mb-2 font-manrope text-lg font-semibold tracking-tight">
									Try what we are building
								</h3>
								<p className="relative mb-6 text-xs leading-relaxed text-primary-foreground/80">
									Start a free trial. Send a private agreement, export proof,
									and attach payouts when your workflow needs them.
								</p>
								<a
									href={MARKETING_CTA.getStartedHref}
									target={
										MARKETING_CTA.getStartedHref.startsWith("http")
											? "_blank"
											: undefined
									}
									rel={
										MARKETING_CTA.getStartedHref.startsWith("http")
											? "noopener noreferrer"
											: undefined
									}
									className="relative inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm transition-all duration-200 hover:bg-white/95"
								>
									<span>{MARKETING_CTA.getStartedLabel}</span>
								</a>
							</div>
						</aside>
					</div>

					<div className="mt-10 flex gap-2 overflow-x-auto border-b border-border/40 pb-4 lg:hidden">
						{CHANGELOG_ERAS.map((era) => {
							const count = grouped.get(era.id)?.length ?? 0;
							if (count === 0) return null;

							return (
								<button
									key={era.id}
									type="button"
									onClick={() => scrollToEra(era.id)}
									className="cursor-pointer whitespace-nowrap rounded-lg border border-border/50 bg-background px-3 py-1.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
								>
									{era.label}
								</button>
							);
						})}
					</div>
				</div>
			</section>
		</MotionProvider>
	);
}
