import { Checkbox } from "@/src/lib/components/ui/checkbox";
import { Label } from "@/src/lib/components/ui/label";
import { Textarea } from "@/src/lib/components/ui/textarea";

const ADDENDUM_PATH = `${import.meta.env.VITE_ASTRO_URL.replace(/\/$/, "")}/legal/settlement-feature-addendum`;

export function PayoutAccessRequestFields(props: {
	useCase: string;
	onUseCaseChange: (v: string) => void;
	acceptTerms: boolean;
	onAcceptTermsChange: (v: boolean) => void;
	sanctionsSelfCert: boolean;
	onSanctionsSelfCertChange: (v: boolean) => void;
	disabled?: boolean;
}) {
	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<Label htmlFor="payout-use-case">Stated use case</Label>
				<Textarea
					id="payout-use-case"
					placeholder="e.g. USDC completion bonus on freelance SOWs sent to known counterparties…"
					value={props.useCase}
					onChange={(e) => props.onUseCaseChange(e.target.value)}
					rows={3}
					disabled={props.disabled}
				/>
			</div>
			<div className="flex items-start gap-2">
				<Checkbox
					id="payout-accept-terms"
					checked={props.acceptTerms}
					onCheckedChange={(v) => props.onAcceptTermsChange(v === true)}
					disabled={props.disabled}
				/>
				<Label
					htmlFor="payout-accept-terms"
					className="text-sm font-normal leading-snug"
				>
					I accept the{" "}
					<a
						href={ADDENDUM_PATH}
						target="_blank"
						rel="noopener noreferrer"
						className="underline"
					>
						Settlement Feature Addendum
					</a>{" "}
					on behalf of this workspace.
				</Label>
			</div>
			<div className="flex items-start gap-2">
				<Checkbox
					id="payout-sanctions"
					checked={props.sanctionsSelfCert}
					onCheckedChange={(v) => props.onSanctionsSelfCertChange(v === true)}
					disabled={props.disabled}
				/>
				<Label
					htmlFor="payout-sanctions"
					className="text-sm font-normal leading-snug"
				>
					We will use payout attachment only in compliance with applicable
					sanctions, export, and anti–money laundering laws.
				</Label>
			</div>
		</div>
	);
}
