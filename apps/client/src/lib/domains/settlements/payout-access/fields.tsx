import { ISO_COUNTRY_OPTIONS, type IsoCountryCode } from "@filosign/shared";
import { Checkbox } from "@/src/lib/components/ui/checkbox";
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/src/lib/components/ui/select";
import { Textarea } from "@/src/lib/components/ui/textarea";

const ADDENDUM_PATH = `${import.meta.env.VITE_ASTRO_URL.replace(/\/$/, "")}/legal/settlement-feature-addendum`;

export function PayoutAccessRequestFields(props: {
	organizationLegalName: string;
	onOrganizationLegalNameChange: (v: string) => void;
	organizationCountry: IsoCountryCode | "";
	onOrganizationCountryChange: (v: IsoCountryCode) => void;
	requesterName: string;
	onRequesterNameChange: (v: string) => void;
	requesterRole: string;
	onRequesterRoleChange: (v: string) => void;
	useCase: string;
	onUseCaseChange: (v: string) => void;
	acceptTerms: boolean;
	onAcceptTermsChange: (v: boolean) => void;
	sanctionsSelfCert: boolean;
	onSanctionsSelfCertChange: (v: boolean) => void;
	disabled?: boolean;
}) {
	const selectedCountry = ISO_COUNTRY_OPTIONS.find(
		(entry) => entry.code === props.organizationCountry,
	);

	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<Label htmlFor="payout-org-legal-name">Organization legal name</Label>
				<Input
					id="payout-org-legal-name"
					placeholder="Legal entity name as registered"
					value={props.organizationLegalName}
					onChange={(e) => props.onOrganizationLegalNameChange(e.target.value)}
					disabled={props.disabled}
					autoComplete="organization"
				/>
			</div>
			<div className="space-y-2">
				<Label htmlFor="payout-org-country">Organization country</Label>
				<Select
					value={props.organizationCountry || null}
					onValueChange={(value) => {
						if (value) {
							props.onOrganizationCountryChange(value as IsoCountryCode);
						}
					}}
					disabled={props.disabled}
				>
					<SelectTrigger id="payout-org-country" className="w-full">
						<SelectValue placeholder="Select country">
							{selectedCountry?.name ?? "Select country"}
						</SelectValue>
					</SelectTrigger>
					<SelectContent>
						{ISO_COUNTRY_OPTIONS.map((entry) => (
							<SelectItem key={entry.code} value={entry.code}>
								{entry.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-2">
					<Label htmlFor="payout-requester-name">Your name</Label>
					<Input
						id="payout-requester-name"
						placeholder="Full name"
						value={props.requesterName}
						onChange={(e) => props.onRequesterNameChange(e.target.value)}
						disabled={props.disabled}
						autoComplete="name"
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="payout-requester-role">Your role</Label>
					<Input
						id="payout-requester-role"
						placeholder="e.g. Founder, Finance lead"
						value={props.requesterRole}
						onChange={(e) => props.onRequesterRoleChange(e.target.value)}
						disabled={props.disabled}
						autoComplete="organization-title"
					/>
				</div>
			</div>
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
