import {
	CheckCircleIcon,
	PaperPlaneRightIcon,
	SpinnerGapIcon,
	XCircleIcon,
} from "@phosphor-icons/react";
import Logo from "@/src/lib/components/app/chrome/logo";
import { Button } from "@/src/lib/components/ui/button";
import { cn } from "@/src/lib/utils/utils";
import { AddSignDraftActions } from "@/src/routes/dashboard/envelope/create/add-sign/-components/draft-actions";
import { useAddSignChrome } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/context/context";

export function AddSignHeader() {
	const { sendStatus, handleSend } = useAddSignChrome();
	const isLoading = sendStatus === "loading" || sendStatus === "signing";
	const isSigning = sendStatus === "signing";
	const isSuccess = sendStatus === "success";
	const isError = sendStatus === "error";

	const getButtonContent = () => {
		if (isSigning) {
			return (
				<>
					<SpinnerGapIcon className="size-4 animate-spin" />
					<p className="hidden sm:block">Signing your fields...</p>
				</>
			);
		}
		if (sendStatus === "loading") {
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
		<header className="glass sticky top-0 z-50 border-b border-border bg-background/95">
			<div className="flex h-16 items-center justify-between px-6">
				<div className="flex items-center gap-4">
					<Logo className="px-0" textClassName="text-foreground" iconOnly />
					<h3>Place fields</h3>
				</div>

				<div className="flex items-center gap-3">
					<AddSignDraftActions />
					<Button
						variant="primary"
						onClick={handleSend}
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
			</div>
		</header>
	);
}
