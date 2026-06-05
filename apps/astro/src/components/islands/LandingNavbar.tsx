import { Pressable, SPRING_TOKENS } from "@filosign/motion";
import { ListIcon, XIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import {
	marketingNavCtaClass,
	marketingPrimaryMdClass,
} from "../../lib/marketing-button";
import { MARKETING_CTA } from "../../lib/marketing-cta";
import { marketingNavStickyClass } from "../../lib/marketing-layout";
import {
	MARKETING_PRESSABLE_HOVER,
	MARKETING_PRESSABLE_TAP,
	type MarketingPace,
	NAV_INTRO_DELAYS,
	NAV_SCROLL_SPRING,
} from "../../lib/marketing-motion";
import MarketingLogo from "./MarketingLogo";

const navLinkClass =
	"font-medium rounded-md px-2 py-2 text-background/90 transition-colors duration-200 hover:bg-background/10 hover:text-background focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

const drawerLinkClass =
	"block rounded-lg px-4 py-3 text-lg font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

const navLinks = [
	{ label: "About", href: "/about" },
	{ label: "Pricing", href: "/pricing" },
	{ label: "Docs", href: "/docs" },
	{ label: "Blog", href: "/blog" },
	{ label: "Changelog", href: "/changelog" },
] as const;

interface LandingNavbarProps {
	pace?: MarketingPace;
}

export default function LandingNavbar({ pace = "page" }: LandingNavbarProps) {
	const intro = NAV_INTRO_DELAYS[pace];
	const menuId = useId();
	const drawerRef = useRef<HTMLDivElement>(null);
	const [isVisible, setIsVisible] = useState(true);
	const [lastScrollY, setLastScrollY] = useState(0);
	const [menuOpen, setMenuOpen] = useState(false);

	useEffect(() => {
		const handleScroll = () => {
			const currentScrollY = window.scrollY;

			if (currentScrollY < 10) {
				setIsVisible(true);
			} else {
				setIsVisible(currentScrollY < lastScrollY);
			}

			setLastScrollY(currentScrollY);
		};

		window.addEventListener("scroll", handleScroll, { passive: true });

		return () => window.removeEventListener("scroll", handleScroll);
	}, [lastScrollY]);

	useEffect(() => {
		document.body.style.overflow = menuOpen ? "hidden" : "";
		return () => {
			document.body.style.overflow = "";
		};
	}, [menuOpen]);

	useEffect(() => {
		if (!menuOpen) return;

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setMenuOpen(false);
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [menuOpen]);

	useEffect(() => {
		if (!menuOpen) return;
		const firstLink = drawerRef.current?.querySelector("a");
		firstLink?.focus();
	}, [menuOpen]);

	return (
		<section className={cn(marketingNavStickyClass, "px-page")}>
			<motion.nav
				className="flex min-w-0 items-center justify-between mx-auto max-w-3xl gap-2 p-rect rounded-large border border-foreground/10 bg-foreground text-background shadow-md lg:max-w-4xl"
				aria-label="Primary"
				initial={{ opacity: 0, y: -50 }}
				animate={{
					opacity: 1,
					y: isVisible ? 0 : -200,
				}}
				transition={{
					opacity: { ...SPRING_TOKENS.smooth, delay: intro.nav },
					y: isVisible
						? { ...SPRING_TOKENS.smooth, delay: intro.nav }
						: NAV_SCROLL_SPRING,
				}}
			>
				<div className="flex min-w-0 items-center gap-2 md:gap-4">
					<MarketingLogo
						textDelay={0.35}
						iconDelay={0.26}
						className="px-0 hidden md:block"
						redirectTo="/"
						iconOnly
					/>
					<MarketingLogo
						textDelay={0.35}
						iconDelay={0.26}
						className="px-0 md:hidden"
						redirectTo="/"
						textOnly
					/>
					<MarketingLogo
						textDelay={0.35}
						iconDelay={0.26}
						className="px-0 hidden md:block"
						redirectTo="/"
						textOnly
					/>
				</div>

				<motion.div
					className="hidden items-center gap-x-3 md:flex lg:gap-x-4"
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						...SPRING_TOKENS.smooth,
						delay: intro.linkGroup,
					}}
				>
					{navLinks.map((link, index) => (
						<motion.a
							key={link.label}
							href={link.href}
							className={navLinkClass}
							initial={{ opacity: 0, y: -15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{
								...SPRING_TOKENS.smooth,
								delay: intro.linkBase + index * intro.linkStagger,
							}}
						>
							{link.label}
						</motion.a>
					))}
				</motion.div>

				<motion.div
					className="flex shrink-0 items-center gap-2"
					initial={{ opacity: 0, x: 30 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{
						...SPRING_TOKENS.smoothHeavy,
						delay: intro.cta,
					}}
				>
					<div className="hidden md:block">
						<Pressable
							preset="snappy"
							whileHover={MARKETING_PRESSABLE_HOVER}
							whileTap={MARKETING_PRESSABLE_TAP}
						>
							<a
								href={MARKETING_CTA.getStartedHref}
								className={marketingNavCtaClass}
							>
								{MARKETING_CTA.getStartedLabel}
							</a>
						</Pressable>
					</div>

					<button
						type="button"
						className="inline-flex size-11 items-center justify-center rounded-lg text-background transition-colors hover:bg-background/10 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:hidden"
						aria-expanded={menuOpen}
						aria-controls={menuId}
						aria-label={menuOpen ? "Close menu" : "Open menu"}
						onClick={() => setMenuOpen((open) => !open)}
					>
						{menuOpen ? (
							<XIcon className="size-6" aria-hidden />
						) : (
							<ListIcon className="size-6" aria-hidden />
						)}
					</button>
				</motion.div>
			</motion.nav>

			<AnimatePresence>
				{menuOpen ? (
					<>
						<motion.button
							type="button"
							aria-label="Close menu"
							className="fixed inset-0 z-40 bg-foreground/40 md:hidden"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={() => setMenuOpen(false)}
						/>
						<motion.div
							ref={drawerRef}
							id={menuId}
							role="dialog"
							aria-modal="true"
							aria-label="Site navigation"
							className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-3xl border border-border bg-background p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-xl md:hidden"
							initial={{ y: "100%" }}
							animate={{ y: 0 }}
							exit={{ y: "100%" }}
							transition={SPRING_TOKENS.snappy}
						>
							<nav aria-label="Mobile" className="flex flex-col gap-1">
								<a
									href="/"
									className={drawerLinkClass}
									onClick={() => setMenuOpen(false)}
								>
									Home
								</a>
								{navLinks.map((link) => (
									<a
										key={link.label}
										href={link.href}
										className={drawerLinkClass}
										onClick={() => setMenuOpen(false)}
									>
										{link.label}
									</a>
								))}
							</nav>
							<div className="mt-6 border-t border-border pt-6">
								<Pressable
									preset="snappy"
									whileHover={MARKETING_PRESSABLE_HOVER}
									whileTap={MARKETING_PRESSABLE_TAP}
								>
									<a
										href={MARKETING_CTA.getStartedHref}
										className={cn(marketingPrimaryMdClass, "w-full min-h-11")}
										onClick={() => setMenuOpen(false)}
									>
										{MARKETING_CTA.getStartedLabel}
									</a>
								</Pressable>
							</div>
						</motion.div>
					</>
				) : null}
			</AnimatePresence>
		</section>
	);
}
