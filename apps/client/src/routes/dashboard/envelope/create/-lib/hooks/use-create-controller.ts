import { useFilosignContext } from "@filosign/react";
import {
	CLIENT_ANALYTICS_EVENTS,
	useCaptureAppEvent,
} from "@filosign/react/analytics";
import {
	useEntitlements,
	useEnvelopeRecipientLimit,
	useMonthlyDocumentQuota,
	useRefetchEntitlementsOnMount,
} from "@filosign/react/billing";
import {
	canUseBasicSettlements,
	canUseSupplementaryAttachments,
} from "@filosign/react/files";
import { useUserProfile } from "@filosign/react/users";
import { walletAccountAddress } from "@filosign/react/utils";
import { useForm, useStore } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { toastUser } from "@/src/lib/copy/toast";
import { TOASTS } from "@/src/lib/copy/toasts";
import {
	buildCreateForm,
	EMPTY_ENVELOPE_FORM,
	getPersistedAttachmentDrafts,
	hasDraftContent,
	hasEnvelopeFormContent,
	hydrateAttachmentPacketDrafts,
	normalizeCreateForm,
	saveAttachmentPacketDrafts,
} from "@/src/lib/domains/drafts";
import { settlementPayoutExceedsBalance } from "@/src/lib/domains/settlements/payout-totals";
import { useAttachedPayoutBalance } from "@/src/lib/domains/settlements/use-attached-payout-balance";
import { resolveRecipientWallets } from "@/src/lib/domains/templates/resolve-recipient-wallets";
import { finalizeTemplateUseAtComposeContinue } from "@/src/lib/domains/templates/template-composer";
import {
	useStorePersist,
	useStorePersistHydrated,
} from "@/src/lib/filosign/use-store";
import { useWalletUsdcBalance } from "@/src/lib/web3/use-wallet-usdc-balance";
import { usePromptPlanUpgrade } from "@/src/routes/dashboard/envelope/create/-lib/hooks/use-prompt-plan-upgrade";
import type { EnvelopeForm } from "@/src/routes/dashboard/envelope/create/-lib/types";
import { resolveComposeAdvanceUpgrade } from "@/src/routes/dashboard/envelope/create/-lib/utils/compose-advance-guards";

const PERSIST_DEBOUNCE_MS = 400;

export function useCreateEnvelopeController(initialValues: EnvelopeForm) {
	const navigate = useNavigate();
	const { rpcQuery, wallet } = useFilosignContext();
	const { data: selfProfile } = useUserProfile();
	const setCreateForm = useStorePersist((s) => s.setCreateForm);
	const clearCreateForm = useStorePersist((s) => s.clearCreateForm);
	const persistHydrated = useStorePersistHydrated();
	const persistHydratedRef = useRef(persistHydrated);
	persistHydratedRef.current = persistHydrated;
	const promptPlanUpgrade = usePromptPlanUpgrade();
	const captureAppEvent = useCaptureAppEvent();
	const { data: entitlements } = useEntitlements();
	useRefetchEntitlementsOnMount();
	const { isWithinRecipientLimit } = useEnvelopeRecipientLimit();
	const { isMonthlyQuotaExhausted } = useMonthlyDocumentQuota();
	const [isAdvancing, setIsAdvancing] = useState(false);
	const walletUsdc = useWalletUsdcBalance();
	const walletUsdcRef = useRef(walletUsdc);
	walletUsdcRef.current = walletUsdc;

	const form = useForm({
		defaultValues: initialValues,
		listeners: {
			onChangeDebounceMs: PERSIST_DEBOUNCE_MS,
			onChange: ({ formApi }) => {
				if (!persistHydratedRef.current) return;

				const value = formApi.state.values;
				const prevDraft = useStorePersist.getState().createForm;
				const hasContent = hasEnvelopeFormContent(value);
				const prevHadContent = hasDraftContent(prevDraft);
				if (!hasContent && !prevHadContent) return;

				void buildCreateForm(value, prevDraft)
					.then(setCreateForm)
					.catch((error) => console.error("Failed to persist draft:", error));
			},
		},
		onSubmit: async ({ value }) => {
			setIsAdvancing(true);
			try {
				const prev = useStorePersist.getState().createForm;
				const upgradeReason = resolveComposeAdvanceUpgrade({
					recipientCount: value.recipients.length,
					settlementDraftCount: value.settlementDrafts?.length ?? 0,
					persistedAttachmentDraftCount:
						getPersistedAttachmentDrafts(prev).length,
					monthlyQuotaExhausted: isMonthlyQuotaExhausted,
					withinRecipientLimit: isWithinRecipientLimit(value.recipients.length),
					settlementsAllowed: canUseBasicSettlements(entitlements),
					supplementaryAttachmentsAllowed:
						canUseSupplementaryAttachments(entitlements),
				});
				if (upgradeReason) {
					promptPlanUpgrade(upgradeReason);
					return;
				}

				const { address, balance } = walletUsdcRef.current;
				if (
					settlementPayoutExceedsBalance({
						drafts: value.settlementDrafts ?? [],
						walletAddress: address,
						walletBalance: balance,
					})
				) {
					toastUser.error(TOASTS.send.payoutExceedsBalance.title, {
						hint: TOASTS.send.payoutExceedsBalance.hint,
					});
					return;
				}

				const prevWithAttachments = prev?.attachmentPacketDrafts?.length
					? {
							...prev,
							attachmentPacketDrafts: await hydrateAttachmentPacketDrafts(
								prev.draftId,
								prev.attachmentPacketDrafts,
							),
						}
					: prev;

				let draft = prev?.templateUse
					? await finalizeTemplateUseAtComposeContinue({
							prev: prevWithAttachments ?? prev,
							formRecipients: value.recipients,
							emailSubject: value.emailSubject,
							emailMessage: value.emailMessage,
							settlementDrafts: value.settlementDrafts ?? [],
						})
					: await buildCreateForm(value, prevWithAttachments);

				if (prev?.templateUse && wallet?.account) {
					const walletAddress = walletAccountAddress(wallet.account);
					const recipients = await resolveRecipientWallets({
						recipients: draft.recipients,
						lookupProfile: (email) =>
							rpcQuery.users.profile.lookup.call({ query: email }),
						selfEmail: selfProfile?.email,
						selfWallet: walletAddress,
					});
					draft = normalizeCreateForm({ ...draft, recipients });
				}

				if (draft.attachmentPacketDrafts?.length) {
					await saveAttachmentPacketDrafts(
						draft.draftId,
						draft.attachmentPacketDrafts,
					);
				}
				setCreateForm(draft);

				captureAppEvent(CLIENT_ANALYTICS_EVENTS.envelopeComposeSubmitted, {
					recipient_count: value.recipients.length,
				});

				navigate({ to: "/dashboard/envelope/create/add-sign" });
			} catch (error) {
				console.error("Failed to prepare documents:", error);
			} finally {
				setIsAdvancing(false);
			}
		},
	});

	const settlementDrafts = useStore(
		form.store,
		(state) => state.values.settlementDrafts ?? [],
	);
	const payoutBalance = useAttachedPayoutBalance(settlementDrafts);

	const showValidationErrors = useStore(
		form.store,
		(state) => state.submissionAttempts > 0,
	);

	const hasContent = useStore(form.store, (state) =>
		hasEnvelopeFormContent(state.values),
	);

	const clearForm = useCallback(() => {
		clearCreateForm();
		form.reset(EMPTY_ENVELOPE_FORM);
	}, [clearCreateForm, form]);

	return useMemo(
		() => ({
			form,
			showValidationErrors,
			isAdvancing,
			hasContent,
			clearForm,
			payoutBalance,
		}),
		[
			form,
			showValidationErrors,
			isAdvancing,
			hasContent,
			clearForm,
			payoutBalance,
		],
	);
}

export type CreateEnvelopeController = ReturnType<
	typeof useCreateEnvelopeController
>;
