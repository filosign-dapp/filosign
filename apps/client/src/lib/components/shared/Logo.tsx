import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { cn } from "../../utils";
import { Image } from "./Image";

interface LogoProps {
	className?: string;
	iconClassName?: string;
	textClassName?: string;
	animatedLogo?: boolean;
	noHref?: boolean;
	iconOnly?: boolean;
	isCollapsed?: boolean;
	onIconClick?: () => void;
	showText?: boolean;
	textDelay?: number;
	iconDelay?: number;
	redirectTo?: string;
	textOnly?: boolean;
}

export default function Logo({
	className,
	iconClassName,
	textClassName,
	redirectTo = "/dashboard",
	animatedLogo = true,
	noHref = false,
	iconOnly = false,
	isCollapsed = false,
	onIconClick,
	showText = true,
	textDelay = 0.1,
	iconDelay = 0.26,
	textOnly = false,
}: LogoProps) {
	const navigate = useNavigate();

	return (
		<motion.button
			className={cn(
				"flex items-center group/logo py-2 gap-3 cursor-pointer transition-all",
				!isCollapsed && "px-4 -ml-1",
				className,
				noHref && "cursor-default",
				iconOnly && "p-0",
			)}
			onClick={() => {
				onIconClick?.();
				if (!noHref) {
					navigate({ to: redirectTo, replace: true });
				}
			}}
		>
			{!textOnly && (
				<motion.div
					className={cn(
						"p-1.5 rounded-sm bg-secondary transition-colors duration-200",
					)}
					initial={animatedLogo ? { scale: 0, rotate: -180 } : {}}
					animate={animatedLogo ? { scale: 1, rotate: 0 } : {}}
					transition={{
						type: "spring",
						stiffness: 345,
						damping: 20,
						delay: iconDelay,
					}}
				>
					<Image
						src="/logo.webp"
						alt="Filosign Logo"
						width={64}
						height={64}
						className={cn(
							`size-8 text-foreground transition-all duration-150`,
							animatedLogo ? `group-hover/logo:-rotate-180` : "",
							iconClassName,
						)}
					/>
				</motion.div>
			)}
			{!iconOnly && !isCollapsed && showText && (
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
		</motion.button>
	);
}
