import { ShieldCheckIcon } from "@phosphor-icons/react";
import MockRow from "../kit/MockRow";

export type ProofPacketRow = {
	label: string;
	value: string;
};

type ProofPacketListProps = {
	title?: string;
	rows: readonly ProofPacketRow[];
};

export default function ProofPacketList({
	title = "Proof packet",
	rows,
}: ProofPacketListProps) {
	return (
		<div className="space-y-2">
			<div className="mb-1 flex items-center gap-2 text-primary">
				<ShieldCheckIcon className="size-4" weight="fill" aria-hidden />
				<span className="font-manrope text-xs font-medium">{title}</span>
			</div>
			{rows.map((row) => (
				<MockRow
					key={row.label}
					className="justify-between px-3 py-2"
					radius="lg"
				>
					<span className="font-manrope text-xs text-muted-foreground">
						{row.label}
					</span>
					<span className="font-manrope text-xs font-medium">{row.value}</span>
				</MockRow>
			))}
		</div>
	);
}
