import { useCancelAttachmentRule } from "@filosign/react/files";
import { Button } from "@/src/lib/components/ui/button";
import { toastUser } from "@/src/lib/copy/toast";
import { TOASTS } from "@/src/lib/copy/toasts";
import { safeAsync } from "@/src/lib/utils/safe";

type Packet = {
	packetId: string;
	label: string | null;
	onChainRuleId: string;
	releaseContractAddress: `0x${string}`;
	released: boolean;
	cancelled: boolean;
};

type Props = {
	packets: Packet[] | undefined;
	signingStarted?: boolean;
	onCancelled?: () => void;
};

export function ConditionalAttachmentsPanel({
	packets,
	signingStarted = false,
	onCancelled,
}: Props) {
	const cancelRule = useCancelAttachmentRule();

	if (!packets?.length) return null;

	const cancellable = packets.filter((p) => !p.released && !p.cancelled);
	if (cancellable.length === 0) return null;

	return (
		<div className="space-y-2 rounded-lg border border-border/60 p-3">
			<div className="space-y-1">
				<p className="text-xs font-medium">Extra files with conditions</p>
				<p className="text-xs text-muted-foreground">
					Recipients can open these only after the signing rules you set are
					met.
					{signingStarted
						? " Rule edits are locked until you clear signatures or void the envelope."
						: null}
				</p>
			</div>
			<ul className="space-y-2">
				{cancellable.map((p) => (
					<li
						key={p.packetId}
						className="flex items-center justify-between gap-2 text-xs"
					>
						<span className="truncate text-muted-foreground">
							{p.label ?? "Attachment"}
						</span>
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="shrink-0 h-7 text-xs"
							disabled={cancelRule.isPending || signingStarted}
							onClick={() => {
								void (async () => {
									const [, err] = await safeAsync(() =>
										cancelRule.mutateAsync({
											onChainRuleId: p.onChainRuleId,
											releaseContractAddress: p.releaseContractAddress,
										}),
									);
									if (err) {
										return;
									}
									toastUser.success(TOASTS.sign.unlockRuleRemoved);
									onCancelled?.();
								})();
							}}
						>
							{cancelRule.isPending ? "Removing…" : "Remove unlock rule"}
						</Button>
					</li>
				))}
			</ul>
		</div>
	);
}
