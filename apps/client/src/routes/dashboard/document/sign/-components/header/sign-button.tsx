import { PenNibIcon, SpinnerGapIcon } from "@phosphor-icons/react";
import { Button } from "@/src/lib/components/ui/button";
import {
	useSignIdentity,
	useSignSigning,
} from "@/src/routes/dashboard/document/sign/-lib/context/context";
import { useSignHeaderUi } from "@/src/routes/dashboard/document/sign/-lib/hooks/use-header-ui";

type SignHeaderSignButtonProps = {
	label: string;
	density: "compact" | "comfortable";
};

export function SignHeaderSignButton({
	label,
	density,
}: SignHeaderSignButtonProps) {
	const { signerAddress } = useSignIdentity();
	const { canSign, signFile } = useSignSigning();
	const { canSubmitSign, setSignConfirmOpen } = useSignHeaderUi();

	if (!canSign || !signerAddress) return null;

	if (density === "comfortable") {
		return (
			<Button
				variant="primary"
				className="hidden gap-2 lg:inline-flex"
				onClick={() => setSignConfirmOpen(true)}
				disabled={signFile.isPending || !canSubmitSign}
			>
				{signFile.isPending ? (
					<>
						<SpinnerGapIcon className="size-4 animate-spin" />
						<span className="hidden sm:inline">Signing…</span>
					</>
				) : (
					<>
						<PenNibIcon className="size-4" weight="bold" />
						<span className="hidden sm:inline">{label}</span>
					</>
				)}
			</Button>
		);
	}

	return (
		<Button
			variant="primary"
			size="sm"
			onClick={() => setSignConfirmOpen(true)}
			disabled={signFile.isPending || !canSubmitSign}
		>
			{signFile.isPending ? (
				<>
					<SpinnerGapIcon className="size-4 animate-spin" />
					Signing…
				</>
			) : (
				label
			)}
		</Button>
	);
}
