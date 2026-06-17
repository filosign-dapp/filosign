import type { SettlementReleaseType } from "@filosign/shared";
import { isCompletionGatedSettlementExpiry } from "@filosign/shared";
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";

type Props = {
	value: string;
	onChange: (value: string) => void;
	releaseType?: SettlementReleaseType;
	id?: string;
};

function expiryHelpText(releaseType?: SettlementReleaseType): string {
	if (releaseType && isCompletionGatedSettlementExpiry(releaseType)) {
		return "Cutoff applies when signing finishes, not when funds are sent. Leave blank for no cutoff.";
	}
	if (releaseType === "specific_signer") {
		return "Cutoff applies when the named signer signs and the payout runs. Leave blank for no cutoff.";
	}
	return "After this date and time, this payout cannot go through. Leave blank for no cutoff.";
}

/** Optional local datetime; empty = no cutoff. */
export function SettlementExpiresAtField({
	value,
	onChange,
	releaseType,
	id = "settlement-expires-at",
}: Props) {
	return (
		<div className="grid gap-2">
			<Label htmlFor={id}>Cutoff date (optional)</Label>
			<Input
				id={id}
				type="datetime-local"
				value={value}
				onChange={(e) => onChange(e.target.value)}
			/>
			<p className="text-xs text-muted-foreground">
				{expiryHelpText(releaseType)}
			</p>
		</div>
	);
}

export function expiresAtFromDatetimeLocal(value: string): bigint | undefined {
	const trimmed = value.trim();
	if (!trimmed) return undefined;
	const ms = new Date(trimmed).getTime();
	if (Number.isNaN(ms)) return undefined;
	return BigInt(Math.floor(ms / 1000));
}
