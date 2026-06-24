import type {
	ReleaseCopyContext,
	SettlementReleaseType,
} from "@filosign/shared";
import {
	composeDisplayReleaseType,
	envelopeMinimumRoutingNote,
	isAdvancedSettlementReleaseType,
	quorumRequiredThresholdLockedHelper,
	releaseTypeHidesThresholdInput,
	settlementReleaseTypeDescription,
	settlementReleaseTypeLabel,
	settlementReleaseTypesForComposeAdvancedVisible,
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
	routingContext?: ReleaseCopyContext;
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
	routingContext,
	releaseSelectId = "settlement-release-type",
	releaseWhenLabel = "Pay out when",
	specificSignerLabel = "Which signer triggers payout",
}: Props) {
	const context = routingContext ?? { quorumN: 0, signerCount: 0 };
	const displayReleaseType = composeDisplayReleaseType(releaseType, context);
	const selectedIsPro = isAdvancedSettlementReleaseType(displayReleaseType);
	const routingNote = envelopeMinimumRoutingNote(context);
	const description = settlementReleaseTypeDescription(
		displayReleaseType,
		context,
	);
	const hideThreshold = releaseTypeHidesThresholdInput(
		displayReleaseType,
		context,
	);

	const releaseOptions = [
		...settlementReleaseTypesForComposeBasic.map((value) => ({
			value,
			label: settlementReleaseTypeLabel(value, context),
			advanced: false,
		})),
		...settlementReleaseTypesForComposeAdvancedVisible(context).map(
			(value) => ({
				value,
				label: settlementReleaseTypeLabel(value, context),
				advanced: true,
			}),
		),
	];

	const needsThreshold =
		!hideThreshold &&
		(displayReleaseType === "at_least_n" ||
			displayReleaseType === "quorum_required" ||
			displayReleaseType === "quorum_set" ||
			displayReleaseType === "quorum_all");

	const thresholdMax =
		context.quorumN > 0
			? context.signerCount
			: context.signerCount > 0
				? context.signerCount
				: null;

	const handleReleaseChange = (value: SettlementReleaseType) => {
		if (isAdvancedSettlementReleaseType(value) && !canAdvanced) {
			onRequireAdvanced();
			return;
		}
		onReleaseTypeChange(value);
	};

	return (
		<>
			{routingNote ? (
				<p className="text-xs leading-relaxed text-muted-foreground">
					{routingNote}
				</p>
			) : null}

			<div className="grid gap-2 w-full">
				<Label htmlFor={releaseSelectId}>{releaseWhenLabel}</Label>
				<Select
					value={displayReleaseType}
					onValueChange={(v) => handleReleaseChange(v as SettlementReleaseType)}
				>
					<SelectTrigger id={releaseSelectId}>
						<SelectValue>
							<span className="inline-flex items-center gap-2">
								{settlementReleaseTypeLabel(displayReleaseType, context)}
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
				<p className="text-xs leading-relaxed text-muted-foreground">
					{description}
				</p>
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

			{hideThreshold ? (
				<p className="text-xs leading-relaxed text-muted-foreground">
					{quorumRequiredThresholdLockedHelper(context)}
				</p>
			) : null}

			{needsThreshold ? (
				<div className="grid gap-2">
					<Label htmlFor={`${releaseSelectId}-threshold`}>
						How many signatures?
					</Label>
					<Input
						id={`${releaseSelectId}-threshold`}
						variant="field"
						inputMode="numeric"
						value={thresholdN}
						onChange={(e) => onThresholdNChange(e.target.value)}
					/>
					{thresholdMax != null ? (
						<p className="text-xs text-muted-foreground">
							Maximum {thresholdMax} on this envelope.
						</p>
					) : null}
				</div>
			) : null}
		</>
	);
}
