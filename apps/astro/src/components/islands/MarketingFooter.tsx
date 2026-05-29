import { SparkleIcon, TwitterLogoIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import MarketingLogo from "./MarketingLogo";

function getFooterSections() {
	return [
		{
			title: "Product",
			links: [
				{ label: "Pricing", href: "/pricing" },
				{ label: "What's new", href: "/changelog" },
			],
		},
		{
			title: "Company",
			links: [
				{ label: "About us", href: "/about" },
				{ label: "Blogs", href: "/blog" },
			],
		},
		{
			title: "Support",
			links: [
				{ label: "Security overview", href: "/security" },
				{ label: "Contact Support", href: "mailto:support@filosign.xyz" },
			],
		},
		{
			title: "Legal",
			links: [
				{ label: "Terms of Service", href: "/terms" },
				{ label: "Privacy Policy", href: "/privacy" },
				{ label: "Acceptable Use", href: "/acceptable-use" },
				{ label: "Subprocessors", href: "/subprocessors" },
				{ label: "E-signature validity", href: "/legal/e-signature-validity" },
				{
					label: "Non-custodial settlement",
					href: "/legal/non-custodial-settlement",
				},
			],
		},
	];
}

const primaryCtaClass =
	"group inline-flex shrink-0 items-center justify-center rounded-xl border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none h-12 px-6 gap-2 bg-primary text-primary-foreground hover:bg-primary/80";

interface MarketingFooterProps {
	appUrl: string;
}

export default function MarketingFooter({ appUrl }: MarketingFooterProps) {
	const footerSections = getFooterSections();

	return (
		<footer className="bg-card rounded-t-[3rem] py-24 flex flex-col justify-between">
			<div className="max-w-7xl mx-auto px-8 md:px-page w-full flex-1 flex flex-col justify-between">
				<div>
					<div className="flex flex-col lg:flex-row justify-between mb-4">
						<div className="max-w-xl">
							<motion.h2
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								className="text-4xl md:text-5xl font-semibold tracking-tight mb-8 font-manrope"
							>
								Start a private agreement workflow
							</motion.h2>
						</div>
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ delay: 0.1 }}
						>
							<a
								href={appUrl}
								target="_blank"
								rel="noopener noreferrer"
								className={`${primaryCtaClass} flex items-center justify-center gap-2`}
							>
								<SparkleIcon className="size-4" weight="fill" />
								Try Filosign beta
							</a>
						</motion.div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-4 border-t border-border/50 pt-16">
						{footerSections.map((section) => (
							<div key={section.title} className="flex flex-col gap-6">
								<h4 className="text-sm font-medium text-muted-foreground font-manrope">
									{section.title}
								</h4>
								<ul className="flex flex-col gap-4">
									{section.links.map((link) => {
										const external = link.href.startsWith("http");
										return (
											<li key={link.label}>
												<a
													href={link.href}
													className="text-sm font-medium hover:text-primary transition-colors font-manrope flex items-center gap-2 group"
													{...(external
														? {
																target: "_blank",
																rel: "noopener noreferrer",
															}
														: {})}
												>
													{link.label}
												</a>
											</li>
										);
									})}
								</ul>
							</div>
						))}
					</div>
				</div>

				<div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-8 border-t border-border/50 pt-4">
					<div className="space-y-2">
						<MarketingLogo
							className="px-0"
							textClassName="text-4xl text-foreground"
							redirectTo="/"
						/>
						<p className="text-xs text-muted-foreground font-manrope">
							© 2026 Filosign. All rights reserved.
						</p>
					</div>

					<div className="flex items-center gap-4">
						<a
							href="https://x.com/filosign"
							target="_blank"
							rel="noreferrer"
							className="p-2 rounded-full bg-background hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground"
						>
							<TwitterLogoIcon className="size-6" weight="fill" />
						</a>
					</div>
				</div>
			</div>
		</footer>
	);
}
