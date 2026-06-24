import { useAttachAttachmentPacketForFile } from "@filosign/react/files";
import { useActiveOrgId } from "@filosign/react/orgs";
import { useProfilesByAddresses } from "@filosign/react/users";
import { normalizePlacementRecipientEmail } from "@filosign/shared";
import { useCallback, useMemo, useState } from "react";
import type { Address, Hex } from "viem";
import { getAddress } from "viem";
import { toastUser } from "@/src/lib/copy/toast";
import type { AttachmentPacketComposeDraft } from "@/src/lib/domains/files/attachment-packet-compose";
import { toAttachmentPacketDraft } from "@/src/lib/domains/files/attachment-packet-compose";
import {
	mapSignersToRecipients,
	routingContextFromEnvelopeProgress,
} from "@/src/lib/domains/satellites";
import { showAppErrorToast } from "@/src/lib/errors";
import type { EnvelopeProgressLike } from "@/src/routes/dashboard/document/sign/-lib/utils/envelope-progress-display";
import { envelopeOpenForGovernance } from "@/src/routes/dashboard/document/sign/-lib/utils/governance";

type SignFileMeta = {
	signers?: {
		wallet: string;
		name?: string | null;
		email?: string | null;
	}[];
	envelopeProgress?: EnvelopeProgressLike | null;
	organizationId?: string | null;
	orgEncryptionPublicKey?: Hex | null;
};

export function useSignAttachmentActions(
	pieceCid: string | undefined,
	file: SignFileMeta | undefined,
) {
	const activeOrgId = useActiveOrgId();
	const attachAttachment = useAttachAttachmentPacketForFile(pieceCid);
	const [attachDialogOpen, setAttachDialogOpen] = useState(false);

	const recipients = useMemo(
		() => mapSignersToRecipients(file?.signers ?? []),
		[file?.signers],
	);
	const routingContext = useMemo(
		() => routingContextFromEnvelopeProgress(file?.envelopeProgress),
		[file?.envelopeProgress],
	);

	const signerAddresses = useMemo(
		() =>
			(file?.signers ?? [])
				.map((s) => s.wallet as Address)
				.filter((w) => w.startsWith("0x")),
		[file?.signers],
	);
	const { data: profilesByAddress } = useProfilesByAddresses(
		signerAddresses.length > 0 ? signerAddresses : undefined,
	);

	const warmRecipientsByEmail = useMemo(() => {
		const out: {
			email: string;
			address: Address;
			encryptionPublicKey: Hex;
		}[] = [];
		for (const signer of file?.signers ?? []) {
			const email = signer.email?.trim();
			if (!email) continue;
			const address = getAddress(signer.wallet as Address);
			const profile = profilesByAddress?.get(address);
			if (!profile?.encryptionPublicKey) continue;
			out.push({
				email: normalizePlacementRecipientEmail(email),
				address,
				encryptionPublicKey: profile.encryptionPublicKey,
			});
		}
		return out;
	}, [file?.signers, profilesByAddress]);

	const envelopeOpenForSenderGovernance = envelopeOpenForGovernance({
		isSender: true,
		envelopeProgress: file?.envelopeProgress,
		pendingSignerReplacement: false,
	});

	const openAttachDialog = useCallback(() => {
		if (!envelopeOpenForSenderGovernance) return;
		setAttachDialogOpen(true);
	}, [envelopeOpenForSenderGovernance]);

	const onSaveAttachment = useCallback(
		async (draft: AttachmentPacketComposeDraft) => {
			if (!pieceCid) return;
			try {
				const packetDraft = toAttachmentPacketDraft(draft, recipients);
				await attachAttachment.mutateAsync({
					drafts: [packetDraft],
					warmRecipientsByEmail,
					organizationId: activeOrgId ?? file?.organizationId ?? undefined,
					orgEncryptionPublicKey: file?.orgEncryptionPublicKey ?? undefined,
				});
				toastUser.success("File packet attached", {
					hint: "Recipients can unlock it when your conditions are met.",
				});
			} catch (error) {
				showAppErrorToast(error);
				throw error;
			}
		},
		[
			activeOrgId,
			attachAttachment,
			file?.orgEncryptionPublicKey,
			file?.organizationId,
			pieceCid,
			recipients,
			warmRecipientsByEmail,
		],
	);

	return {
		attachDialogOpen,
		setAttachDialogOpen,
		openAttachDialog,
		onSaveAttachment,
		attachPending: attachAttachment.isPending,
		attachRecipients: recipients,
		routingContext,
		envelopeOpenForSenderGovernance,
	};
}
