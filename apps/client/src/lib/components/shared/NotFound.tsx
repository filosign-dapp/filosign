import {
	CaretLeftIcon,
	HouseIcon,
	MagnifyingGlassIcon,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import { Button } from "@/src/lib/components/ui/button";

type NotFoundProps = {
	title?: string;
	description?: string;
	showBackButton?: boolean;
	showHomeButton?: boolean;
	onBack?: () => void;
	onHome?: () => void;
};

export function NotFound({
	title = "404",
	description = "Oops! The page you're looking for doesn't exist.",
	showBackButton = true,
	showHomeButton = true,
}: NotFoundProps) {
	return (
		<div className="flex flex-col flex-1 gap-4 justify-center items-center px-4 text-center h-screen w-screen">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.6, ease: "easeOut" }}
				className="max-w-md space-y-6"
			>
				{/* 404 Illustration */}
				<motion.div
					initial={{ scale: 0.8, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
					transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
					className="relative"
				>
					<div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-muted/20">
						<MagnifyingGlassIcon className="h-16 w-16 text-muted-foreground" />
					</div>
				</motion.div>

				{/* Content */}
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.4, duration: 0.5 }}
					className="space-y-3"
				>
					<h1 className="text-4xl font-bold tracking-tight text-foreground">
						{title}
					</h1>
					<p className="text-sm sm:text-lg text-muted-foreground">
						{description}
					</p>
				</motion.div>

				{/* Actions */}
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.6, duration: 0.5 }}
					className="flex flex-col gap-3 sm:flex-row sm:justify-center"
				>
					{showBackButton && (
						<Button variant="primary" className="gap-2">
							<CaretLeftIcon className="h-4 w-4" />
							Go Back
						</Button>
					)}
					{showHomeButton && (
						<Button className="gap-2">
							<HouseIcon className="h-4 w-4" />
							Go Home
						</Button>
					)}
				</motion.div>
			</motion.div>
		</div>
	);
}
