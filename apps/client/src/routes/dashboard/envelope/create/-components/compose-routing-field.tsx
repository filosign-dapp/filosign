import { useEntitlements } from "@filosign/react/billing";
import {
	canUseAdvancedRouting,
	canUseAdvancedSettlements,
	useBasicPayoutAttachGate,
} from "@filosign/react/files";
import type { RegisterRoutingInput } from "@filosign/shared";
import { normalizePlacementRecipientEmail } from "@filosign/shared";
import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import { Checkbox } from "@/src/lib/components/ui/checkbox";
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";
import { Switch } from "@/src/lib/components/ui/switch";
import { DocsLink } from "@/src/lib/docs/docs-link";
import { DOCS_LINKS } from "@/src/lib/docs/links";
import { handleBasicPayoutGateBlock } from "@/src/lib/domains/settlements/basic-payout-gate";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { usePromptPlanUpgrade } from "@/src/routes/dashboard/envelope/create/-lib/context/entitlement-upgrade-context";
import { isValidRecipientEmail } from "@/src/routes/dashboard/envelope/create/-lib/utils/recipient-email";

function signerEmailOptions(
	recipients: {
		role: string;
		email: string;
		name?: string | null;
	}[],
) {
	const seen = new Set<string>();
	const out: { email: string; label: string }[] = [];
	for (const r of recipients) {
		if (r.role !== "signer") continue;
		const raw = r.email.trim();
		if (!isValidRecipientEmail(raw)) continue;
		const email = normalizePlacementRecipientEmail(raw);
		if (seen.has(email)) continue;
		seen.add(email);
		out.push({ email, label: r.name?.trim() || raw });
	}
	return out;
}

export function ComposeRoutingField() {
	const createForm = useStorePersist((s) => s.createForm);
	const setCreateForm = useStorePersist((s) => s.setCreateForm);
	const { data: entitlements } = useEntitlements();
	const promptPlanUpgrade = usePromptPlanUpgrade();
	const advancedRouting = canUseAdvancedRouting(entitlements);

	const signerOptions = useMemo(
		() => signerEmailOptions(createForm?.recipients ?? []),
		[createForm?.recipients],
	);

	if (!createForm) return null;

	const routing = createForm.registerRouting ?? {};
	const quorumEnabled = (routing.quorumN ?? 0) > 0;
	const signerCount = signerOptions.length;
	const maxQuorum = Math.min(255, signerCount);

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

	const setQuorumEnabled = (enabled: boolean) => {
		if (enabled && !requireAdvanced()) return;

		if (!enabled) {
			patchRouting({ quorumN: 0, quorumSetEmails: [] });
			return;
		}

		if (signerCount === 0) return;
		const defaultN = signerCount === 1 ? 1 : Math.min(2, signerCount);
		patchRouting({
			quorumN:
				routing.quorumN && routing.quorumN > 0 ? routing.quorumN : defaultN,
			quorumSetEmails: signerOptions.map((s) => s.email),
		});
	};

	return (
		<section className="space-y-3 rounded-xl border border-border/60 bg-muted/5 p-5">
			<div className="flex items-center justify-between gap-4">
				<div className="min-w-0">
					<Label htmlFor="quorum-enabled" className="text-sm font-medium">
						Minimum signatures
					</Label>
					<p className="text-xs text-muted-foreground">
						All signers must sign unless you set a minimum below.
					</p>
				</div>
				<Switch
					id="quorum-enabled"
					checked={quorumEnabled}
					onCheckedChange={setQuorumEnabled}
				/>
			</div>

			<AnimatePresence initial={false}>
				{quorumEnabled ? (
					<motion.div
						key="quorum-input"
						initial={{ opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -6 }}
						transition={{
							type: "spring",
							stiffness: 230,
							damping: 26,
						}}
						className="grid gap-1.5 sm:max-w-xs"
					>
						<Label htmlFor="quorum-n">Signatures needed</Label>
						<Input
							id="quorum-n"
							type="number"
							min={1}
							max={maxQuorum}
							value={routing.quorumN ?? 1}
							disabled={signerCount === 0}
							onChange={(e) => {
								if (!requireAdvanced()) return;
								const raw = Number(e.target.value);
								if (!Number.isFinite(raw) || raw < 1) return;
								const capped = Math.min(maxQuorum, Math.floor(raw));
								patchRouting({
									quorumN: capped,
									quorumSetEmails: signerOptions.map((s) => s.email),
								});
							}}
						/>
						<p className="text-xs text-muted-foreground">
							{signerCount === 0
								? "Add signers first."
								: `${routing.quorumN ?? 1} of ${signerCount} signers.`}
						</p>
					</motion.div>
				) : null}
			</AnimatePresence>
			<DocsLink href={DOCS_LINKS.signingAndRouting()} className="text-xs">
				Signing and routing guide
			</DocsLink>
		</section>
	);
}

export function ComposeSettlementOptionsField() {
	const createForm = useStorePersist((s) => s.createForm);
	const setCreateForm = useStorePersist((s) => s.setCreateForm);
	const { data: entitlements } = useEntitlements();
	const promptPlanUpgrade = usePromptPlanUpgrade();
	const advanced = canUseAdvancedSettlements(entitlements);
	const { gate } = useBasicPayoutAttachGate();
	const draftCount = createForm?.settlementDrafts?.length ?? 0;

	if (!createForm || draftCount < 2) return null;

	return (
		<section className="space-y-3 rounded-xl border border-border/60 bg-muted/5 p-5">
			<div>
				<h2 className="text-sm font-semibold">Multiple payouts</h2>
				<p className="text-xs text-muted-foreground">
					Combine several USDC payouts into one rule.
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
						if (handleBasicPayoutGateBlock(gate, promptPlanUpgrade)) return;
						setCreateForm({
							...createForm,
							combineSettlementLegs: next === true,
						});
					}}
				/>
				<span>One rule for {draftCount} recipients</span>
			</label>
		</section>
	);
}
