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
import { mergeEnvelopeFormIntoCreateForm } from "@/src/lib/domains/drafts";
import type { Recipient } from "@/src/lib/domains/files/envelope-form-types";
import { isValidRecipientEmail } from "@/src/lib/domains/invites/recipient-email";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { useCreateEnvelope } from "@/src/routes/dashboard/envelope/create/-lib/context/create-envelope-context";
import { usePromptPlanUpgrade } from "@/src/routes/dashboard/envelope/create/-lib/hooks/use-prompt-plan-upgrade";

function signerEmailOptions(recipients: Recipient[]) {
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

export function ComposeRoutingContent({
	recipients,
}: {
	recipients: Recipient[];
}) {
	const { form } = useCreateEnvelope();
	const createForm = useStorePersist((s) => s.createForm);
	const setCreateForm = useStorePersist((s) => s.setCreateForm);
	const formValues = form.state.values;
	const { data: entitlements } = useEntitlements();
	const promptPlanUpgrade = usePromptPlanUpgrade();
	const advancedRouting = canUseAdvancedRouting(entitlements);

	const signerOptions = useMemo(
		() => signerEmailOptions(recipients),
		[recipients],
	);

	const routing = createForm?.registerRouting ?? {};
	const quorumEnabled = (routing.quorumN ?? 0) > 0;
	const signerCount = signerOptions.length;
	const quorumToggleDisabled = signerCount === 0;
	const maxQuorum = Math.min(255, signerCount);

	const patchRouting = (patch: Partial<RegisterRoutingInput>) => {
		void (async () => {
			const prev = createForm ?? useStorePersist.getState().createForm;
			const current = prev?.registerRouting ?? {};
			const merged = await mergeEnvelopeFormIntoCreateForm(formValues, prev, {
				registerRouting: { ...current, ...patch },
			});
			setCreateForm(merged);
		})().catch((error) => {
			console.error("Failed to update routing:", error);
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
		<>
			<div className="flex items-center justify-between gap-4">
				<div className="min-w-0">
					<h3 className="text-sm font-semibold">Minimum signatures</h3>
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
		</>
	);
}
