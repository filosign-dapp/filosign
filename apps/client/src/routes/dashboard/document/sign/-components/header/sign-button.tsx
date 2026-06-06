import { SpinnerIcon } from "@phosphor-icons/react";
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

	const button = (
		<Button
			variant="primary"
			size="sm"
			onClick={() => setSignConfirmOpen(true)}
			disabled={signFile.isPending || !canSubmitSign}
		>
			{signFile.isPending ? (
				<>
					<SpinnerIcon className="size-4 animate-spin" />
					Signing…
				</>
			) : (
				label
			)}
		</Button>
	);

	if (density === "comfortable") {
		return (
			<>
				<div className="w-px h-6 bg-border mx-2" />
				{button}
			</>
		);
	}

	return button;
}
