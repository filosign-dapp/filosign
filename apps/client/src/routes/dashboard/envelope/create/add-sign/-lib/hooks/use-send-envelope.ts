import { useFilosignContext } from "@filosign/react";
import { useCaptureAppEvent } from "@filosign/react/analytics";
import { useEntitlements } from "@filosign/react/billing";
import { useMarkDraftSent } from "@filosign/react/drafts";
import { useSendFile, useSignFile } from "@filosign/react/files";
import { useActiveOrganization } from "@filosign/react/orgs";
import {
	type ProfileByAddress,
	useProfilesByAddresses,
	useUserProfile,
} from "@filosign/react/users";
import { useCallback, useMemo, useRef } from "react";
import type { Address } from "viem";
import type {
	CreateForm,
	SignatureField,
} from "@/src/lib/domains/files/envelope-form-types";
import type { PlacementFieldRect } from "@/src/lib/domains/files/field-box";
import type {
	ColdSharePackage,
	WarmShareSummary,
} from "@/src/lib/domains/invites/types";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { useWalletUsdcBalance } from "@/src/lib/web3/use-wallet-usdc-balance";
import type { Recipient } from "@/src/routes/dashboard/envelope/create/-lib/types";
import { runEnvelopeSend } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/send/run";
import { recipientResolvedSignerAddress } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/send-envelope";

type SendStatus = "idle" | "loading" | "signing" | "success" | "error";

export function useSendEnvelope(args: {
	createForm: CreateForm | null;
	signatureFields: SignatureField[];
	placementDocHeight: number;
	docWidth: number;
	fieldBoxCss: PlacementFieldRect;
	sendStatus: SendStatus;
	setSendStatus: (status: SendStatus) => void;
	setPostSendDialogOpen: (open: boolean) => void;
	setPostSendShare: (share: ColdSharePackage | null) => void;
	setPostSendWarmSummary: (summary: WarmShareSummary | null) => void;
}) {
	const {
		createForm,
		signatureFields,
		placementDocHeight,
		docWidth,
		fieldBoxCss,
		setSendStatus,
		setPostSendDialogOpen,
		setPostSendShare,
		setPostSendWarmSummary,
	} = args;

	const captureAppEvent = useCaptureAppEvent();
	const sendFile = useSendFile();
	const signFile = useSignFile();
	const markDraftSent = useMarkDraftSent();
	const { data: entitlements } = useEntitlements();
	const { rpcQuery } = useFilosignContext();
	const activeOrg = useActiveOrganization();
	const { data: selfProfile } = useUserProfile();
	const setCreateForm = useStorePersist((s) => s.setCreateForm);
	const isSendingRef = useRef(false);
	const { address: walletAddress, balance: walletUsdcBalance } =
		useWalletUsdcBalance();

	const recipientAddresses = useMemo(
		() =>
			(createForm?.recipients ?? [])
				.map((r) => recipientResolvedSignerAddress(r))
				.filter((a): a is Address => a !== null),
		[createForm?.recipients],
	);
	const { data: recipientProfilesMap, isLoading: recipientProfilesLoading } =
		useProfilesByAddresses(
			recipientAddresses.length > 0 ? recipientAddresses : undefined,
		);

	const recipientProfilesMapWithRecipient = useMemo(() => {
		const map = new Map<
			Address,
			{ recipient: Recipient; profile: ProfileByAddress }
		>();
		createForm?.recipients?.forEach((recipient) => {
			const addr = recipientResolvedSignerAddress(recipient);
			if (!addr) return;
			const profile = recipientProfilesMap?.get(addr);
			if (profile) {
				map.set(addr, { recipient, profile });
			}
		});
		return map;
	}, [createForm?.recipients, recipientProfilesMap]);

	const handleSend = useCallback(async () => {
		if (isSendingRef.current || !createForm) return;

		await runEnvelopeSend({
			createForm,
			signatureFields,
			entitlements,
			recipientProfilesLoading,
			recipientProfilesMapWithRecipient,
			placementDocHeight,
			docWidth,
			fieldBoxCss,
			walletAddress,
			walletUsdcBalance,
			activeOrg,
			selfProfile,
			sendFile,
			signFile,
			markDraftSent,
			rpcQuery,
			captureAppEvent,
			setCreateForm,
			setSendStatus,
			setPostSendShare,
			setPostSendWarmSummary,
			setPostSendDialogOpen,
			isSendingRef,
		});
	}, [
		createForm,
		signatureFields,
		entitlements,
		recipientProfilesLoading,
		recipientProfilesMapWithRecipient,
		placementDocHeight,
		docWidth,
		fieldBoxCss,
		walletAddress,
		walletUsdcBalance,
		activeOrg,
		selfProfile,
		sendFile,
		signFile,
		markDraftSent,
		rpcQuery,
		captureAppEvent,
		setCreateForm,
		setSendStatus,
		setPostSendShare,
		setPostSendWarmSummary,
		setPostSendDialogOpen,
	]);

	return { handleSend, isSendingRef };
}
