import type { SettlementReleaseType } from "@filosign/shared";
import {
	isAdvancedSettlementReleaseType,
	normalizeSettlementReleaseType,
	settlementReleaseTypeLabel,
	settlementReleaseTypesForComposeAdvanced,
	settlementReleaseTypesForComposeBasic,
} from "@filosign/shared";
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/src/lib/components/ui/select";
import { ProFeatureMark } from "@/src/lib/domains/entitlements/pro-feature-mark";

export type SignerOption = { email: string; label: string };

type Props = {
	releaseType: SettlementReleaseType;
	onReleaseTypeChange: (value: SettlementReleaseType) => void;
	canAdvanced: boolean;
	onRequireAdvanced: () => void;
	specificSignerEmail: string;
	onSpecificSignerEmailChange: (email: string) => void;
	signerOptions: SignerOption[];
	thresholdN: string;
	onThresholdNChange: (value: string) => void;
	releaseSelectId?: string;
	releaseWhenLabel?: string;
	specificSignerLabel?: string;
};

export function SettlementReleaseFields({
	releaseType,
	onReleaseTypeChange,
	canAdvanced,
	onRequireAdvanced,
	specificSignerEmail,
	onSpecificSignerEmailChange,
	signerOptions,
	thresholdN,
	onThresholdNChange,
	releaseSelectId = "settlement-release-type",
	releaseWhenLabel = "Pay out when",
	specificSignerLabel = "Which signer triggers payout",
}: Props) {
	const displayReleaseType = normalizeSettlementReleaseType(releaseType);
	const selectedIsPro = isAdvancedSettlementReleaseType(displayReleaseType);

	const releaseOptions = [
		...settlementReleaseTypesForComposeBasic.map((value) => ({
			value,
			label: settlementReleaseTypeLabel(value),
			advanced: false,
		})),
		...settlementReleaseTypesForComposeAdvanced.map((value) => ({
			value,
			label: settlementReleaseTypeLabel(value),
			advanced: true,
		})),
	];

	const needsThreshold =
		displayReleaseType === "at_least_n" ||
		displayReleaseType === "quorum_required" ||
		displayReleaseType === "quorum_set" ||
		displayReleaseType === "quorum_all";

	const handleReleaseChange = (value: SettlementReleaseType) => {
		if (isAdvancedSettlementReleaseType(value) && !canAdvanced) {
			onRequireAdvanced();
			return;
		}
		onReleaseTypeChange(value);
	};

	return (
		<>
			<div className="grid gap-2 w-full">
				<Label htmlFor={releaseSelectId}>{releaseWhenLabel}</Label>
				<Select
					value={displayReleaseType}
					onValueChange={(v) => handleReleaseChange(v as SettlementReleaseType)}
				>
					<SelectTrigger id={releaseSelectId}>
						<SelectValue>
							<span className="inline-flex items-center gap-2">
								{settlementReleaseTypeLabel(displayReleaseType)}
								{selectedIsPro ? <ProFeatureMark size="xs" /> : null}
							</span>
						</SelectValue>
					</SelectTrigger>
					<SelectContent className="min-w-lg">
						{releaseOptions.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								<span className="inline-flex items-center gap-2">
									{option.label}
									{option.advanced ? <ProFeatureMark size="xs" /> : null}
								</span>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{displayReleaseType === "specific_signer" ? (
				<div className="grid gap-2">
					<Label htmlFor={`${releaseSelectId}-signer`}>
						{specificSignerLabel}
					</Label>
					{signerOptions.length === 0 ? (
						<p className="text-xs text-muted-foreground">
							Add at least one signer with a valid email address first.
						</p>
					) : (
						<Select
							value={specificSignerEmail}
							onValueChange={(v) => {
								if (v != null) onSpecificSignerEmailChange(v);
							}}
						>
							<SelectTrigger id={`${releaseSelectId}-signer`}>
								<SelectValue placeholder="Select signer">
									{signerOptions.find((s) => s.email === specificSignerEmail)
										?.label ?? "Select signer"}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								{signerOptions.map((s) => (
									<SelectItem key={s.email} value={s.email}>
										{s.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
				</div>
			) : null}

			{needsThreshold ? (
				<div className="grid gap-2">
					<Label htmlFor={`${releaseSelectId}-threshold`}>
						How many signatures are needed
					</Label>
					<Input
						id={`${releaseSelectId}-threshold`}
						variant="field"
						inputMode="numeric"
						value={thresholdN}
						onChange={(e) => onThresholdNChange(e.target.value)}
					/>
				</div>
			) : null}
		</>
	);
}
