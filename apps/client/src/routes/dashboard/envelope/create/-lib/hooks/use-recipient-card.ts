import { useUserProfileByQuery } from "@filosign/react/users";
import { useEffect, useRef, useState } from "react";
import { getAddress, isAddress } from "viem";
import { useDebouncedSearch } from "@/src/lib/utils/use-debounced-search";
import { RECIPIENT_LOOKUP_DEBOUNCE_MS } from "@/src/routes/dashboard/envelope/create/-lib/constants/recipient-card";
import {
	useRecipients,
	useSettlements,
} from "@/src/routes/dashboard/envelope/create/-lib/context/envelope-draft-context";
import { useRecipientsContext } from "@/src/routes/dashboard/envelope/create/-lib/context/recipients-context";
import type { SettlementAttachmentDraft } from "@/src/routes/dashboard/envelope/create/-lib/types/settlement-attachment";
import { filosignProfileDisplayName } from "@/src/routes/dashboard/envelope/create/-lib/utils/filosign-profile";
import {
	isValidRecipientEmail,
	recipientLookupEmail,
} from "@/src/routes/dashboard/envelope/create/-lib/utils/recipient-email";
import {
	getDraftForRecipient,
	removeDraftForRecipient,
	upsertRecipientDraft,
} from "@/src/routes/dashboard/envelope/create/-lib/utils/settlement-drafts";

export function useRecipientCard(index: number) {
	const { recipients, updateRecipient, removeRecipient } =
		useRecipientsContext();
	const { value: allRecipients } = useRecipients();
	const { value: settlementDrafts, onChange: onSettlementDraftsChange } =
		useSettlements();
	const [settlementDialogOpen, setSettlementDialogOpen] = useState(false);

	const recipient = recipients?.[index];
	const clientRowId = recipient?.clientRowId;
	const attachedDraft = clientRowId
		? getDraftForRecipient(settlementDrafts, clientRowId)
		: undefined;

	const emailTrimmed = recipient?.email.trim() ?? "";
	const emailValid =
		emailTrimmed.length > 0 && isValidRecipientEmail(emailTrimmed);
	const lookupEmail = recipientLookupEmail(emailTrimmed);

	const { debouncedSearch: debouncedLookupEmail, isSettled: lookupSettled } =
		useDebouncedSearch(lookupEmail, RECIPIENT_LOOKUP_DEBOUNCE_MS);

	const profileQuery = useUserProfileByQuery({ email: debouncedLookupEmail });
	const profile = profileQuery.data;
	const isFilosignRecipient =
		lookupSettled && profileQuery.isSuccess && !!profile;

	const canAttachFunds =
		isFilosignRecipient &&
		!!profile?.walletAddress &&
		isAddress(profile.walletAddress);

	const invalidEmailSyntax = emailTrimmed.length > 0 && !emailValid;
	const autofillKeyRef = useRef<string | null>(null);

	useEffect(() => {
		if (!canAttachFunds) setSettlementDialogOpen(false);
	}, [canAttachFunds]);

	useEffect(() => {
		if (!clientRowId || !attachedDraft) return;
		if (!emailValid) {
			onSettlementDraftsChange(
				removeDraftForRecipient(settlementDrafts, clientRowId),
			);
			return;
		}
		if (!lookupSettled || profileQuery.isFetching) return;
		if (!canAttachFunds) {
			onSettlementDraftsChange(
				removeDraftForRecipient(settlementDrafts, clientRowId),
			);
		}
	}, [
		clientRowId,
		attachedDraft,
		emailValid,
		canAttachFunds,
		lookupSettled,
		profileQuery.isFetching,
		onSettlementDraftsChange,
		settlementDrafts,
	]);

	useEffect(() => {
		if (
			!recipient ||
			!isFilosignRecipient ||
			!profile ||
			!debouncedLookupEmail
		) {
			return;
		}

		const patch: { walletAddress?: `0x${string}`; name?: string } = {};

		if (profile.walletAddress && isAddress(profile.walletAddress)) {
			const addr = getAddress(profile.walletAddress);
			if (recipient.walletAddress?.toLowerCase() !== addr.toLowerCase()) {
				patch.walletAddress = addr;
			}
		}

		if (
			!recipient.name.trim() &&
			autofillKeyRef.current !== debouncedLookupEmail
		) {
			const name = filosignProfileDisplayName(profile);
			if (name) {
				patch.name = name;
				autofillKeyRef.current = debouncedLookupEmail;
			}
		}

		if (Object.keys(patch).length > 0) {
			updateRecipient(index, patch);
		}
	}, [
		recipient,
		isFilosignRecipient,
		profile,
		debouncedLookupEmail,
		index,
		updateRecipient,
	]);

	useEffect(() => {
		if (!lookupSettled) autofillKeyRef.current = null;
	}, [lookupSettled]);

	const saveSettlementDraft = (draft: SettlementAttachmentDraft) => {
		onSettlementDraftsChange(upsertRecipientDraft(settlementDrafts, draft));
	};

	const removeSettlementDraft = () => {
		if (!clientRowId) return;
		onSettlementDraftsChange(
			removeDraftForRecipient(settlementDrafts, clientRowId),
		);
	};

	return {
		recipient,
		allRecipients: allRecipients ?? [],
		index,
		updateRecipient,
		removeRecipient,
		attachedDraft,
		clientRowId,
		invalidEmailSyntax,
		isFilosignRecipient,
		canAttachFunds,
		settlementDialogOpen,
		setSettlementDialogOpen,
		saveSettlementDraft,
		removeSettlementDraft,
	};
}
