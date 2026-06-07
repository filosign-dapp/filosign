import {
	buildPracticePlacementManifest,
	WELCOME_PRACTICE_ENVELOPE_NAME,
	welcomePracticePdfBytes,
} from "@filosign/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { Address, Hex } from "viem";
import { useFilosignContext } from "../../context/useFilosignContext";
import { ackFile } from "../../lib/ack-file/ack-file";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import { useSendFile } from "../files/useSendFile";
import { useActiveOrganization } from "../orgs/useActiveOrganization";
import { useActivationProgress } from "./useActivationProgress";
import { useUserProfile } from "./useUserProfile";

export function useProvisionPracticeEnvelope() {
	const sendFile = useSendFile();
	const queryClient = useQueryClient();
	const { data: profile } = useUserProfile();
	const { contracts, wallet } = useFilosignContext();
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const activeOrg = useActiveOrganization();
	const { activationQuery } = useActivationProgress();

	const ensureAcknowledged = useCallback(
		async (pieceCid: string) => {
			const detail = await rpcQuery.files.piece.detail.call({ pieceCid });
			if (detail.participantAccess?.acknowledged) {
				return;
			}

			if (!isAuthed || !contracts || !wallet) {
				throw new Error("Wallet connection required");
			}

			const authSubjectCommitment = profile?.authSubjectCommitment;
			if (!authSubjectCommitment) {
				throw new Error(
					"Profile missing Auth subject commitment; try re-login.",
				);
			}

			await ackFile(
				{
					contracts,
					wallet,
					rpcQuery,
					authSubjectCommitment,
				},
				{ pieceCid },
			);

			void queryClient.invalidateQueries({
				queryKey: rpcQuery.files.piece.detail.key({
					input: { pieceCid },
				}),
			});
		},
		[
			contracts,
			isAuthed,
			profile?.authSubjectCommitment,
			queryClient,
			rpcQuery,
			wallet,
		],
	);

	const provision = useCallback(async () => {
		if (activationQuery.data?.practicePieceCid) {
			return activationQuery.data.practicePieceCid;
		}

		const email = profile?.email?.trim();
		if (!email || !wallet || !activeOrg?.id || !profile) {
			throw new Error("Profile, wallet, and workspace required");
		}

		const encryptionPublicKey = profile.encryptionPublicKey as Hex;
		const placementManifest = buildPracticePlacementManifest({
			userEmail: email,
		});
		const pdfBytes = welcomePracticePdfBytes();

		await sendFile.mutateAsync({
			signers: [
				{
					address: wallet.account.address as Address,
					encryptionPublicKey,
				},
			],
			viewers: [],
			documents: [
				{
					id: placementManifest.documents[0]?.id ?? "welcome-practice-v1",
					name: WELCOME_PRACTICE_ENVELOPE_NAME,
					mimeType: "application/pdf",
					bytes: pdfBytes,
				},
			],
			metadata: { name: WELCOME_PRACTICE_ENVELOPE_NAME },
			placementManifest,
			viewerEmails: [],
			organizationId: activeOrg.id,
			orgEncryptionPublicKey: activeOrg.encryptionPublicKey as Hex,
			isPractice: true,
		});

		const refreshed = await activationQuery.refetch();
		const pieceCid = refreshed.data?.practicePieceCid;
		if (!pieceCid) {
			throw new Error("Practice envelope was sent but pieceCid is missing");
		}

		await ensureAcknowledged(pieceCid);
		return pieceCid;
	}, [
		activeOrg?.encryptionPublicKey,
		activeOrg?.id,
		activationQuery,
		ensureAcknowledged,
		profile?.email,
		profile?.encryptionPublicKey,
		sendFile,
		wallet,
	]);

	return {
		provision,
		ensureAcknowledged,
		isPending: sendFile.isPending,
		practicePieceCid: activationQuery.data?.practicePieceCid ?? null,
	};
}
