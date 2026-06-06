import { motion } from "motion/react";
import { cn } from "../../lib/cn";

interface MarketingLogoProps {
	className?: string;
	iconClassName?: string;
	textClassName?: string;
	redirectTo?: string;
	iconOnly?: boolean;
	textOnly?: boolean;
	textDelay?: number;
	iconDelay?: number;
}

export default function MarketingLogo({
	className = "",
	iconClassName,
	textClassName,
	redirectTo = "/",
	iconOnly = false,
	textOnly = false,
	textDelay = 0.35,
	iconDelay = 0.26,
}: MarketingLogoProps) {
	return (
		<a
			href={redirectTo}
			className={cn(
				"flex items-center group/logo py-2 gap-3 transition-all",
				!className.includes("px-0") && "px-4 -ml-1",
				className,
			)}
		>
			{!textOnly && (
				<motion.div
					className="p-1.5 rounded-sm bg-secondary transition-colors duration-200"
					initial={{ scale: 0, rotate: -180 }}
					animate={{ scale: 1, rotate: 0 }}
					transition={{
						type: "spring",
						stiffness: 345,
						damping: 20,
						delay: iconDelay,
					}}
				>
					<img
						src="/logo-64.webp"
						alt="Filosign Logo"
						width={32}
						height={32}
						className={cn(
							"size-8 text-foreground transition-all duration-150 group-hover/logo:-rotate-180",
							iconClassName,
						)}
					/>
				</motion.div>
			)}
			{!iconOnly && (
				<motion.h3
					className={cn(
						"text-secondary font-manrope transition-colors duration-200",
						textClassName,
					)}
					initial={{ opacity: 0, x: -20 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{
						type: "spring",
						stiffness: 230,
						damping: 25,
						delay: textDelay,
					}}
				>
					filosign
				</motion.h3>
			)}
		</a>
	);
}
