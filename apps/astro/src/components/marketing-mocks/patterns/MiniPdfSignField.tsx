import { CheckCircleIcon } from "@phosphor-icons/react";
import MockAvatar from "../kit/MockAvatar";
import { mockPersonas } from "../tokens";

type MiniPdfSignFieldProps = {
	signerName?: string;
	signerInitial?: string;
};

export default function MiniPdfSignField({
	signerName = mockPersonas.bob.name,
	signerInitial = mockPersonas.bob.name[0] ?? "B",
}: MiniPdfSignFieldProps) {
	return (
		<div className="space-y-3">
			<div className="rounded-lg border border-border/60 bg-card/10 p-2">
				<div className="mb-2 h-1.5 w-3/4 rounded bg-muted" />
				<div className="mb-2 h-1.5 w-1/2 rounded bg-muted" />
				<div className="flex h-10 items-center justify-center rounded-md border border-dashed border-primary/50 bg-secondary/20">
					<span className="font-manrope text-[10px] font-medium text-primary">
						Signature
					</span>
				</div>
			</div>
			<div className="flex items-center gap-2">
				<MockAvatar initial={signerInitial} size="sm" />
				<span className="font-manrope text-xs font-medium">
					{signerName} signed
				</span>
				<CheckCircleIcon
					className="size-4 -ml-1 text-primary"
					weight="fill"
					aria-hidden
				/>
			</div>
		</div>
	);
}
