import { Pressable, SPRING_TOKENS } from "@filosign/motion";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { marketingNavCtaClass } from "../../lib/marketing-button";
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

const navLinks = [
	{ label: "About", href: "/about" },
	{ label: "Pricing", href: "/pricing" },
	{ label: "Blog", href: "/blog" },
	{ label: "Changelog", href: "/changelog" },
] as const;

interface LandingNavbarProps {
	appUrl: string;
	pace?: MarketingPace;
}

export default function LandingNavbar({
	appUrl,
	pace = "page",
}: LandingNavbarProps) {
	const intro = NAV_INTRO_DELAYS[pace];
	const [isVisible, setIsVisible] = useState(true);
	const [lastScrollY, setLastScrollY] = useState(0);

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

	return (
		<section className="sticky top-10 z-50 p-page">
			<motion.nav
				className="flex justify-between items-center mx-auto max-w-3xl p-rect rounded-large border border-foreground/10 bg-foreground text-background shadow-md"
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
				<div className="flex items-center gap-4">
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
						className="px-0"
						redirectTo="/"
						textOnly
					/>
				</div>

				<motion.div
					className="hidden items-center space-x-4 md:flex"
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
					className="flex items-center gap-2"
					initial={{ opacity: 0, x: 30 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{
						...SPRING_TOKENS.smoothHeavy,
						delay: intro.cta,
					}}
				>
					<Pressable
						preset="snappy"
						whileHover={MARKETING_PRESSABLE_HOVER}
						whileTap={MARKETING_PRESSABLE_TAP}
					>
						<a
							href={appUrl}
							target="_blank"
							rel="noopener noreferrer"
							className={marketingNavCtaClass}
						>
							Start free
						</a>
					</Pressable>
				</motion.div>
			</motion.nav>
		</section>
	);
}
