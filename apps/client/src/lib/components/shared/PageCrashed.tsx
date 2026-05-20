import {
	ArrowClockwiseIcon,
	CaretLeftIcon,
	HouseIcon,
	SmileySadIcon,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import { Button } from "@/src/lib/components/ui/button";

type PageCrashedProps = {
	title?: string;
	description?: string;
	showBackButton?: boolean;
	showHomeButton?: boolean;
	showRetryButton?: boolean;
	onBack?: () => void;
	onHome?: () => void;
	onRetry?: () => void;
};

export function PageCrashed({
	title = "Oops! Something went wrong",
	description = "We encountered an unexpected error.",
	showBackButton = true,
	showHomeButton = false,
	showRetryButton = true,
	onBack,
	onHome,
	onRetry,
}: PageCrashedProps) {
	return (
		<div className="flex flex-col flex-1 gap-4 justify-center items-center px-4 text-center">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.6, ease: "easeOut" }}
				className="space-y-6 max-w-md"
			>
				{/* Crash Illustration */}
				<motion.div
					initial={{ scale: 0.8, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
					transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
					className="relative"
				>
					<div className="flex justify-center items-center mx-auto w-32 h-32 rounded-full bg-muted/20">
						<SmileySadIcon
							weight="regular"
							className="w-16 h-16 text-muted-foreground"
						/>
					</div>
				</motion.div>

				{/* Content */}
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.4, duration: 0.5 }}
					className="space-y-3"
				>
					<h1 className="text-foreground">{title}</h1>
					<p className="text-muted-foreground">{description}</p>
				</motion.div>

				{/* Actions */}
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.6, duration: 0.5 }}
					className="flex flex-col gap-3 sm:flex-row sm:justify-center"
				>
					{showBackButton && (
						<Button variant="ghost" onClick={onBack} className="gap-2">
							<CaretLeftIcon className="w-4 h-4" />
							Go Back
						</Button>
					)}
					{showHomeButton && (
						<Button variant="ghost" onClick={onHome} className="gap-2">
							<HouseIcon className="w-4 h-4" />
							Go Home
						</Button>
					)}
					{showRetryButton && (
						<Button variant="primary" onClick={onRetry} className="gap-2">
							<ArrowClockwiseIcon className="w-4 h-4" />
							Try Again
						</Button>
					)}
				</motion.div>
			</motion.div>
		</div>
	);
}
