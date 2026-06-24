import {
	FILE_ACK_INTENT_LABELS,
	FILE_ACK_INTENT_VERSION_V1,
} from "@filosign/shared";
import { Button } from "@/src/lib/components/ui/button";

export function EnvelopeAckGate(props: {
	isComplete: boolean;
	onAcknowledge: () => void | Promise<void>;
	pending: boolean;
}) {
	const { isComplete, onAcknowledge, pending } = props;

	return (
		<div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
			{isComplete ? (
				<>
					<p className="text-sm font-medium">Envelope complete</p>
					<p className="max-w-md text-sm text-muted-foreground">
						This envelope is complete on-chain. Signing is closed. Accept to
						view the signed document.
					</p>
				</>
			) : (
				<p className="max-w-md text-sm text-muted-foreground">
					{FILE_ACK_INTENT_LABELS[FILE_ACK_INTENT_VERSION_V1]}
				</p>
			)}
			<Button
				variant="primary"
				onClick={() => void onAcknowledge()}
				disabled={pending}
			>
				{pending ? "Accepting…" : isComplete ? "Accept & view" : "Accept file"}
			</Button>
		</div>
	);
}
