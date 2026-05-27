import { SPRING_TOKENS } from "@filosign/motion";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { cn } from "../../lib/cn";
import {
	type MarketingPace,
	NAV_INTRO_DELAYS,
	NAV_SCROLL_SPRING,
} from "../../lib/marketing-motion";
import MarketingLogo from "./MarketingLogo";

const navLinks = [
	{ label: "About", href: "/about" },
	{ label: "Pricing", href: "/pricing" },
	{ label: "Blog", href: "/blog" },
	{ label: "Changelog", href: "/changelog" },
];

const secondaryButtonClass =
	"group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none h-9 gap-1.5 px-2.5 bg-secondary text-secondary-foreground hover:bg-secondary/80 min-w-28 font-semibold";

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
				className="flex justify-between items-center mx-auto max-w-3xl p-rect rounded-large glass text-background bg-foreground/90"
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
							className="font-medium transition-colors duration-200 hover:bg-foreground/50 rounded-md px-2 py-2"
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
					<a
						href={appUrl}
						target="_blank"
						rel="noopener noreferrer"
						className={cn(secondaryButtonClass)}
					>
						Get Started
					</a>
				</motion.div>
			</motion.nav>
		</section>
	);
}
