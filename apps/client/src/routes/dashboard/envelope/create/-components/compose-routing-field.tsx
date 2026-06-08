import { useEntitlements } from "@filosign/react/billing";
import { canUseAdvancedRouting } from "@filosign/react/files";
import type { RegisterRoutingInput } from "@filosign/shared";
import { normalizePlacementRecipientEmail } from "@filosign/shared";
import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import { DisabledTooltip } from "@/src/lib/components/ui/disabled-tooltip";
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";
import { Switch } from "@/src/lib/components/ui/switch";
import { DocsLink } from "@/src/lib/docs/docs-link";
import { DOCS_LINKS } from "@/src/lib/docs/links";
import { ProFeatureMark } from "@/src/lib/domains/entitlements/pro-feature-mark";
import { isValidRecipientEmail } from "@/src/lib/domains/invites/recipient-email";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { usePromptPlanUpgrade } from "@/src/routes/dashboard/envelope/create/-lib/hooks/use-prompt-plan-upgrade";

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
	const quorumToggleDisabled = signerCount === 0;
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
					<Label
						htmlFor="quorum-enabled"
						className="inline-flex items-center gap-2 text-sm font-medium"
					>
						Minimum signatures
						<ProFeatureMark size="xs" />
					</Label>
					<p className="text-xs text-muted-foreground">
						All signers must sign unless you set a minimum below.
					</p>
				</div>
				<DisabledTooltip
					disabled={quorumToggleDisabled}
					reason="Add signers first."
				>
					<Switch
						id="quorum-enabled"
						checked={quorumEnabled}
						onCheckedChange={setQuorumEnabled}
						disabled={quorumToggleDisabled}
					/>
				</DisabledTooltip>
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
