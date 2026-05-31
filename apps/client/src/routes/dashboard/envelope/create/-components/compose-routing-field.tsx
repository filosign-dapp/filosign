import { useEntitlements } from "@filosign/react/billing";
import {
	canUseAdvancedRouting,
	canUseAdvancedSettlements,
	canUseBasicSettlements,
} from "@filosign/react/files";
import type { RegisterRoutingInput } from "@filosign/shared";
import { normalizePlacementRecipientEmail } from "@filosign/shared";
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
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { usePromptPlanUpgrade } from "@/src/routes/dashboard/envelope/create/-lib/context/entitlement-upgrade-context";
import { isValidRecipientEmail } from "@/src/routes/dashboard/envelope/create/-lib/utils/recipient-email";

export function ComposeRoutingField() {
	const createForm = useStorePersist((s) => s.createForm);
	const setCreateForm = useStorePersist((s) => s.setCreateForm);
	const { data: entitlements } = useEntitlements();
	const promptPlanUpgrade = usePromptPlanUpgrade();
	const advancedRouting = canUseAdvancedRouting(entitlements);

	if (!createForm) return null;

	const routing = createForm.registerRouting ?? {};
	const signers = createForm.recipients.filter((r) => r.role === "signer");

	const patchRouting = (patch: Partial<RegisterRoutingInput>) => {
		setCreateForm({
			...createForm,
			registerRouting: { ...routing, ...patch },
		});
	};

	const requireAdvanced = () => {
		if (advancedRouting) return true;
		promptPlanUpgrade("features.routing.advanced");
		return false;
	};

	return (
		<section className="space-y-4 rounded-xl border border-border/60 bg-muted/5 p-5">
			<div className="space-y-1">
				<h2 className="text-sm font-semibold">Signing order</h2>
				<p className="text-xs text-muted-foreground">
					Parallel signing is default. Teams Pro can require sequential order,
					optional signers, or quorum.
				</p>
			</div>

			<div className="grid gap-2 sm:max-w-xs">
				<Label htmlFor="routing-mode">Routing mode</Label>
				<Select
					value={String(routing.routingMode ?? 0)}
					onValueChange={(value) => {
						if (value === "1" && !requireAdvanced()) return;
						patchRouting({ routingMode: value === "1" ? 1 : 0 });
					}}
				>
					<SelectTrigger id="routing-mode">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="0">Parallel (default)</SelectItem>
						<SelectItem value="1">Sequential</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{routing.routingMode === 1 ? (
				<div className="grid gap-2">
					<Label htmlFor="routing-order">Signing order (emails)</Label>
					<Input
						id="routing-order"
						placeholder="alice@example.com, bob@example.com"
						value={(routing.routingOrderEmails ?? []).join(", ")}
						onChange={(e) => {
							if (!requireAdvanced()) return;
							const emails = e.target.value
								.split(",")
								.map((part) => part.trim())
								.filter(Boolean)
								.map((email) => normalizePlacementRecipientEmail(email));
							patchRouting({ routingOrderEmails: emails });
						}}
					/>
				</div>
			) : null}

			<div className="grid gap-2 sm:max-w-xs">
				<Label htmlFor="quorum-n">Registry quorum N (0 = disabled)</Label>
				<Input
					id="quorum-n"
					type="number"
					min={0}
					max={255}
					value={routing.quorumN ?? 0}
					onChange={(e) => {
						if (!requireAdvanced()) return;
						patchRouting({ quorumN: Number(e.target.value) || 0 });
					}}
				/>
			</div>

			{signers.length > 0 ? (
				<div className="space-y-2">
					<Label>Optional signers (Teams Pro)</Label>
					{createForm.recipients.map((signer, index) => {
						if (signer.role !== "signer") return null;
						const email = signer.email.trim();
						if (!isValidRecipientEmail(email)) return null;
						const checked = signer.signerRequired === false;
						return (
							<label
								key={signer.clientRowId ?? `${email}-${index}`}
								htmlFor={`optional-signer-${index}`}
								className="flex items-center gap-2 text-sm"
							>
								<Checkbox
									id={`optional-signer-${index}`}
									checked={checked}
									onCheckedChange={(next) => {
										if (!requireAdvanced()) return;
										const recipients = createForm.recipients.map((r, i) =>
											i === index ? { ...r, signerRequired: next !== true } : r,
										);
										setCreateForm({ ...createForm, recipients });
									}}
								/>
								<span>{email}, optional for quorum</span>
							</label>
						);
					})}
				</div>
			) : null}
		</section>
	);
}

export function ComposeSettlementOptionsField() {
	const createForm = useStorePersist((s) => s.createForm);
	const setCreateForm = useStorePersist((s) => s.setCreateForm);
	const { data: entitlements } = useEntitlements();
	const promptPlanUpgrade = usePromptPlanUpgrade();
	const advanced = canUseAdvancedSettlements(entitlements);
	const basic = canUseBasicSettlements(entitlements);
	const draftCount = createForm?.settlementDrafts?.length ?? 0;

	if (!createForm || draftCount < 2) return null;

	return (
		<section className="space-y-3 rounded-xl border border-border/60 bg-muted/5 p-5">
			<div className="space-y-1">
				<h2 className="text-sm font-semibold">Payout layout</h2>
				<p className="text-xs text-muted-foreground">
					Combine attached payouts into one atomic multi-leg rule (Teams Pro).
				</p>
			</div>
			<label
				htmlFor="combine-settlement-legs"
				className="flex items-center gap-2 text-sm"
			>
				<Checkbox
					id="combine-settlement-legs"
					checked={Boolean(createForm.combineSettlementLegs)}
					onCheckedChange={(next) => {
						if (next === true && !advanced) {
							promptPlanUpgrade("features.settlement.advanced");
							return;
						}
						if (!basic) {
							promptPlanUpgrade("features.settlement.basic");
							return;
						}
						setCreateForm({
							...createForm,
							combineSettlementLegs: next === true,
						});
					}}
				/>
				<span>Single rule with {draftCount} payout legs</span>
			</label>
		</section>
	);
}
