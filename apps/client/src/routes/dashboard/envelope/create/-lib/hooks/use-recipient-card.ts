import { useEffect, useRef } from "react";
import { getAddress, isAddress } from "viem";
import { useRecipientsContext } from "@/src/routes/dashboard/envelope/create/-lib/context/recipients-context";
import { useRecipientPayoutEligibility } from "@/src/routes/dashboard/envelope/create/-lib/hooks/use-recipient-payout-eligibility";
import { filosignProfileDisplayName } from "@/src/routes/dashboard/envelope/create/-lib/utils/filosign-profile";
import {
	getDraftForRecipient,
	removeDraftForRecipient,
} from "@/src/routes/dashboard/envelope/create/-lib/utils/settlement-drafts";

export function useRecipientCard(index: number) {
	const {
		recipients,
		updateRecipient,
		removeRecipient,
		settlementDrafts,
		onSettlementDraftsChange,
	} = useRecipientsContext();

	const recipient = recipients?.[index];
	const clientRowId = recipient?.clientRowId;
	const attachedDraft = clientRowId
		? getDraftForRecipient(settlementDrafts, clientRowId)
		: undefined;

	const emailTrimmed = recipient?.email.trim() ?? "";

	const {
		emailValid,
		debouncedLookupEmail,
		lookupSettled: debouncedLookupSettled,
		isFilosignRecipient,
		isSelfRecipient,
		canAttachPayout,
		profile,
		profileQuery,
	} = useRecipientPayoutEligibility(recipient);

	const invalidEmailSyntax = emailTrimmed.length > 0 && !emailValid;
	const autofillKeyRef = useRef<string | null>(null);

	useEffect(() => {
		if (!clientRowId || !attachedDraft) return;
		if (!emailValid) {
			onSettlementDraftsChange(
				removeDraftForRecipient(settlementDrafts, clientRowId),
			);
			return;
		}
		if (!debouncedLookupSettled || profileQuery.isFetching) return;
		if (!canAttachPayout) {
			onSettlementDraftsChange(
				removeDraftForRecipient(settlementDrafts, clientRowId),
			);
		}
	}, [
		clientRowId,
		attachedDraft,
		emailValid,
		canAttachPayout,
		debouncedLookupSettled,
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
			const addr = getAddress(profile.walletAddress) as `0x${string}`;
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
		if (!debouncedLookupSettled) autofillKeyRef.current = null;
	}, [debouncedLookupSettled]);

	useEffect(() => {
		if (!recipient || !isSelfRecipient || recipient.role !== "viewer") return;
		updateRecipient(index, { role: "signer" });
	}, [recipient, isSelfRecipient, index, updateRecipient]);

	return {
		recipient,
		index,
		updateRecipient,
		removeRecipient,
		invalidEmailSyntax,
		isFilosignRecipient,
		isSelfRecipient,
		profile,
	};
}
