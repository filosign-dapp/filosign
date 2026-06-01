import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";

type Props = {
	value: string;
	onChange: (value: string) => void;
	id?: string;
};

/** Optional local datetime; empty = no cutoff. */
export function SettlementExpiresAtField({
	value,
	onChange,
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
				After this date and time, this payout cannot go through. Leave blank for
				no cutoff.
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
