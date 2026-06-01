import type { SettlementReleaseType } from "@filosign/shared";
import {
	isAdvancedSettlementReleaseType,
	settlementReleaseTypeLabel,
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

const BASIC_RELEASE_TYPES: SettlementReleaseType[] = [
	"all_signed",
	"specific_signer",
];

const ADVANCED_RELEASE_TYPES: SettlementReleaseType[] = [
	"all_required_signed",
	"all_signed_complete",
	"at_least_n",
	"quorum_required",
	"quorum_set",
	"quorum_all",
	"all_of_set",
];

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
}: Props) {
	const releaseOptions = [
		...BASIC_RELEASE_TYPES.map((value) => ({
			value,
			label: settlementReleaseTypeLabel(value),
			advanced: false,
		})),
		...ADVANCED_RELEASE_TYPES.map((value) => ({
			value,
			label: settlementReleaseTypeLabel(value),
			advanced: true,
		})),
	];

	const needsThreshold =
		releaseType === "at_least_n" ||
		releaseType === "quorum_required" ||
		releaseType === "quorum_set" ||
		releaseType === "quorum_all";

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
				<Label htmlFor={releaseSelectId}>Pay out when</Label>
				<Select
					value={releaseType}
					onValueChange={(v) => handleReleaseChange(v as SettlementReleaseType)}
				>
					<SelectTrigger id={releaseSelectId} className="">
						<SelectValue />
					</SelectTrigger>
					<SelectContent className="min-w-lg">
						{releaseOptions.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
								{option.advanced ? " · Teams Pro" : ""}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{releaseType === "specific_signer" ? (
				<div className="grid gap-2">
					<Label htmlFor={`${releaseSelectId}-signer`}>
						Which signer triggers payout
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
								<SelectValue placeholder="Select signer" />
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
						inputMode="numeric"
						value={thresholdN}
						onChange={(e) => onThresholdNChange(e.target.value)}
					/>
				</div>
			) : null}
		</>
	);
}
