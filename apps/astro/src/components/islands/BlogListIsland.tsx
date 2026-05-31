import { type FormEvent, useState } from "react";
import { cn } from "../../lib/cn";
import { MARKETING_CTA } from "../../lib/marketing-cta";
import { marketingSectionClass } from "../../lib/marketing-layout";

interface BlogPost {
	id: string;
	data: {
		title: string;
		description: string;
		readingTime: string;
		dateDisplay: string;
		publishedISO: string;
		author: {
			name: string;
			role: string;
			avatar: string;
		};
		heroImage: string;
		heroVideo?: string;
		quote?: string;
		draft: boolean;
		featured: boolean;
		tags: string[];
	};
}

interface BlogListIslandProps {
	posts: BlogPost[];
}

export default function BlogListIsland({ posts }: BlogListIslandProps) {
	// Extract unique tags and filter out empty strings/nulls
	const uniqueTags = Array.from(
		new Set(posts.flatMap((p) => p.data.tags || [])),
	).filter(Boolean);
	const allTags = ["All", ...uniqueTags];

	const [selectedTag, setSelectedTag] = useState<string>("All");

	// Email subscription states
	const [email, setEmail] = useState("");
	const [subscribed, setSubscribed] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	const handleSubscribe = (e: FormEvent) => {
		e.preventDefault();
		if (!email.trim()) return;
		setSubmitting(true);
		setTimeout(() => {
			setSubmitting(false);
			setSubscribed(true);
			setEmail("");
		}, 800);
	};

	const filteredPosts = posts.filter((post) => {
		if (selectedTag === "All") {
			return true;
		}
		return post.data.tags?.includes(selectedTag);
	});

	return (
		<section className="bg-background pb-20 pt-8">
			<div className={marketingSectionClass}>
				<div className="grid grid-cols-1 lg:grid-cols-[1fr_22rem] gap-12 lg:gap-16 items-start">
					{/* Left Column: Posts List */}
					<div className="space-y-6">
						<div className="flex items-center justify-between border-b border-border/40 pb-4">
							<h2 className="text-2xl font-medium font-manrope tracking-tight text-foreground">
								{selectedTag === "All"
									? "Latest Posts"
									: `${selectedTag} Posts`}
							</h2>
							<span className="text-sm text-muted-foreground font-medium">
								{filteredPosts.length}{" "}
								{filteredPosts.length === 1 ? "article" : "articles"}
							</span>
						</div>

						{/* Mobile Categories scrollbar */}
						<div className="lg:hidden -mx-page px-page overflow-x-auto hide-scrollbar flex gap-2 py-2 border-b border-border/40 mb-6">
							{allTags.map((tag) => {
								const isActive = selectedTag === tag;
								return (
									<button
										key={tag}
										type="button"
										onClick={() => setSelectedTag(tag)}
										className={cn(
											"px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer border whitespace-nowrap",
											isActive
												? "bg-primary text-primary-foreground border-transparent shadow-sm"
												: "bg-background text-muted-foreground border-border/50 hover:bg-muted hover:text-foreground",
										)}
									>
										{tag}
									</button>
								);
							})}
						</div>

						{/* Posts */}
						<div className="space-y-6">
							{filteredPosts.length > 0 ? (
								<ul className="flex flex-col gap-6">
									{filteredPosts.map((p) => (
										<li key={p.id}>
											<a
												href={`/blog/${p.id}`}
												className="group block rounded-2xl border border-transparent hover:border-border/60 hover:bg-muted/10 lg:-mx-5 lg:p-5 p-4 transition-all duration-300"
											>
												<div className="flex flex-wrap items-center gap-3">
													<span className="text-sm font-medium text-muted-foreground">
														{p.data.dateDisplay}
													</span>
													<span className="text-muted-foreground/40 text-xs">
														•
													</span>
													<span className="text-sm text-muted-foreground">
														{p.data.readingTime}
													</span>
													{p.data.tags?.map((tag) => (
														<span
															key={tag}
															className="inline-flex items-center rounded-full bg-muted/60 px-2.5 py-0.5 text-xs font-medium text-muted-foreground border border-border/40"
														>
															{tag}
														</span>
													))}
												</div>
												<h3 className="block text-xl font-medium font-manrope text-foreground mt-2 group-hover:text-primary transition-colors">
													{p.data.title}
												</h3>
												<p className="block text-muted-foreground mt-2 leading-relaxed text-sm md:text-base">
													{p.data.description}
												</p>
											</a>
										</li>
									))}
								</ul>
							) : (
								<div className="text-center py-16 border border-dashed border-border/60 rounded-2xl bg-muted/5">
									<svg
										className="mx-auto h-12 w-12 text-muted-foreground/60"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										aria-hidden="true"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={1.5}
											d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
										/>
									</svg>
									<h3 className="mt-4 text-sm font-semibold text-foreground">
										No posts found
									</h3>
									<p className="mt-1 text-sm text-muted-foreground">
										We couldn't find any articles matching "{selectedTag}".
									</p>
								</div>
							)}
						</div>
					</div>

					{/* Right Column: Sidebar (Sticky on desktop) */}
					<aside className="sticky top-28 self-start space-y-8 w-full">
						{/* Category List (Desktop only) */}
						<div className="hidden lg:block border border-border/60 bg-muted/10 backdrop-blur-sm rounded-2xl p-6">
							<h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
								Categories
							</h3>
							<div className="flex flex-col items-start gap-2 w-full">
								{allTags.map((tag) => {
									const isActive = selectedTag === tag;
									return (
										<button
											key={tag}
											type="button"
											onClick={() => setSelectedTag(tag)}
											className={cn(
												"w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer border flex items-center justify-between group/cat",
												isActive
													? "bg-primary text-primary-foreground border-transparent shadow-sm"
													: "bg-background text-muted-foreground border-border/50 hover:bg-muted hover:text-foreground",
											)}
										>
											<span>{tag}</span>
											{isActive ? (
												<span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
											) : (
												<span className="h-1.5 w-1.5 rounded-full bg-transparent group-hover/cat:bg-muted-foreground/30" />
											)}
										</button>
									);
								})}
							</div>
						</div>

						{/* Newsletter signup Card */}
						<div className="border border-border/60 bg-muted/10 backdrop-blur-sm rounded-2xl p-6">
							<h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
								Newsletter
							</h3>
							<p className="text-sm text-muted-foreground mb-4 leading-relaxed">
								Get cryptographic insights and product updates delivered
								directly to your inbox.
							</p>

							{subscribed ? (
								<div className="text-center py-4 bg-emerald-500/5 rounded-xl border border-emerald-500/20 px-2">
									<div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
										<svg
											className="h-5 w-5"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
											strokeWidth={2.5}
											aria-hidden="true"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												d="M5 13l4 4L19 7"
											/>
										</svg>
									</div>
									<h4 className="text-sm font-semibold text-foreground">
										Subscribed!
									</h4>
									<p className="mt-1 text-xs text-muted-foreground">
										Keep an eye on your inbox for updates.
									</p>
								</div>
							) : (
								<form onSubmit={handleSubscribe} className="space-y-3">
									<div>
										<label htmlFor="email-input" className="sr-only">
											Email address
										</label>
										<input
											id="email-input"
											type="email"
											required
											placeholder="name@email.com"
											value={email}
											onChange={(e) => setEmail(e.target.value)}
											className="w-full px-3 py-2 bg-background border border-border/80 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
										/>
									</div>
									<button
										type="submit"
										disabled={submitting}
										className="w-full py-2 px-4 bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
									>
										{submitting ? "Subscribing..." : "Subscribe"}
									</button>
								</form>
							)}
						</div>

						{/* Product CTA Card */}
						<div className="relative overflow-hidden rounded-2xl bg-primary text-primary-foreground p-6 shadow-lg border border-foreground/5 group">
							{/* Background gradient blob glow */}
							<div className="absolute -right-16 -top-16 w-32 h-32 rounded-full bg-emerald-500/25 blur-2xl transition-transform duration-500 group-hover:scale-150" />

							<h3 className="font-manrope text-lg font-semibold tracking-tight text-white mb-2">
								Sovereign Agreements
							</h3>
							<p className="text-xs text-primary-foreground/80 leading-relaxed mb-6">
								Experience end-to-end client-side encryption and post-quantum
								signing with programmable settlements.
							</p>
							<a
								href={MARKETING_CTA.sandboxUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm hover:bg-white/95 transition-all duration-200 gap-1.5 group/link"
							>
								<span>{MARKETING_CTA.tryFilosignLabel}</span>
								<svg
									className="h-3.5 w-3.5 transform transition-transform duration-200 group-hover/link:translate-x-1"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									strokeWidth={2}
									aria-hidden="true"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M14 5l7 7m0 0l-7 7m7-7H3"
									/>
								</svg>
							</a>
						</div>
					</aside>
				</div>
			</div>
		</section>
	);
}
