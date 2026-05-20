import {
	CheckCircleIcon,
	PaperPlaneRightIcon,
	SpinnerGapIcon,
	XCircleIcon,
} from "@phosphor-icons/react";
import Logo from "@/src/lib/components/shared/Logo";
import { Button } from "@/src/lib/components/ui/button";
import { cn } from "@/src/lib/utils/utils";

interface HeaderProps {
	onSend: () => void;
	status?: "idle" | "loading" | "success" | "error";
}

export default function Header({ onSend, status = "idle" }: HeaderProps) {
	const isLoading = status === "loading";
	const isSuccess = status === "success";
	const isError = status === "error";

	const getButtonContent = () => {
		if (isLoading) {
			return (
				<>
					<SpinnerGapIcon className="size-4 animate-spin" />
					<p className="hidden sm:block">Sending...</p>
				</>
			);
		}
		if (isSuccess) {
			return (
				<>
					<CheckCircleIcon className="size-4" weight="fill" />
					<p className="hidden sm:block">Document Sent</p>
				</>
			);
		}
		if (isError) {
			return (
				<>
					<XCircleIcon className="size-4" weight="fill" />
					<p className="hidden sm:block">Failed to Send</p>
				</>
			);
		}
		return (
			<>
				<PaperPlaneRightIcon className="size-4" weight="bold" />
				<p className="hidden sm:block">Send Envelope</p>
			</>
		);
	};

	return (
		<header className="sticky top-0 z-50 glass bg-background/95 border-b border-border">
			<div className="flex items-center justify-between h-16 px-6">
				<div className="flex items-center gap-4">
					<Logo
						className="px-0"
						textClassName="text-foreground font-bold"
						iconOnly
					/>
					<h3>Add Signature</h3>
				</div>

				<Button
					variant="primary"
					onClick={onSend}
					disabled={isLoading}
					className={cn(
						"gap-2 transition-colors duration-300",
						isSuccess && "bg-green-600 hover:bg-green-700",
						isError && "bg-destructive hover:bg-destructive/90",
					)}
				>
					{getButtonContent()}
				</Button>
			</div>
		</header>
	);
}
