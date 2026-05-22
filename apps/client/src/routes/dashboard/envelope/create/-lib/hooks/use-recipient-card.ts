import { useUserProfileByQuery } from "@filosign/react/users";
import { useEffect, useRef, useState } from "react";
import { getAddress, isAddress } from "viem";
import { useDebouncedSearch } from "@/src/lib/utils/use-debounced-search";
import { RECIPIENT_LOOKUP_DEBOUNCE_MS } from "@/src/routes/dashboard/envelope/create/-lib/constants/recipient-card";
import {
	usePayments,
	useRecipients,
} from "@/src/routes/dashboard/envelope/create/-lib/context/envelope-draft-context";
import { useRecipientsContext } from "@/src/routes/dashboard/envelope/create/-lib/context/recipients-context";
import type { PaymentAttachmentDraft } from "@/src/routes/dashboard/envelope/create/-lib/types/payment-attachment";
import { filosignProfileDisplayName } from "@/src/routes/dashboard/envelope/create/-lib/utils/filosign-profile";
import {
	getDraftForRecipient,
	removeDraftForRecipient,
	upsertRecipientDraft,
} from "@/src/routes/dashboard/envelope/create/-lib/utils/payment-drafts";
import {
	isValidRecipientEmail,
	recipientLookupEmail,
} from "@/src/routes/dashboard/envelope/create/-lib/utils/recipient-email";

export function useRecipientCard(index: number) {
	const { recipients, updateRecipient, removeRecipient } =
		useRecipientsContext();
	const { value: allRecipients } = useRecipients();
	const { value: paymentDrafts, onChange: onPaymentDraftsChange } =
		usePayments();
	const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

	const recipient = recipients?.[index];
	const clientRowId = recipient?.clientRowId;
	const attachedDraft = clientRowId
		? getDraftForRecipient(paymentDrafts, clientRowId)
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
		if (!canAttachFunds) setPaymentDialogOpen(false);
	}, [canAttachFunds]);

	useEffect(() => {
		if (!clientRowId || !attachedDraft) return;
		if (!emailValid) {
			onPaymentDraftsChange(
				removeDraftForRecipient(paymentDrafts, clientRowId),
			);
			return;
		}
		if (!lookupSettled || profileQuery.isFetching) return;
		if (!canAttachFunds) {
			onPaymentDraftsChange(
				removeDraftForRecipient(paymentDrafts, clientRowId),
			);
		}
	}, [
		clientRowId,
		attachedDraft,
		emailValid,
		canAttachFunds,
		lookupSettled,
		profileQuery.isFetching,
		onPaymentDraftsChange,
		paymentDrafts,
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

	const savePaymentDraft = (draft: PaymentAttachmentDraft) => {
		onPaymentDraftsChange(upsertRecipientDraft(paymentDrafts, draft));
	};

	const removePaymentDraft = () => {
		if (!clientRowId) return;
		onPaymentDraftsChange(removeDraftForRecipient(paymentDrafts, clientRowId));
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
		paymentDialogOpen,
		setPaymentDialogOpen,
		savePaymentDraft,
		removePaymentDraft,
	};
}
