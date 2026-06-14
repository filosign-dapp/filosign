import {
	buildPracticePlacementManifest,
	WELCOME_PRACTICE_ENVELOPE_NAME,
	welcomePracticePdfBytes,
} from "@filosign/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { Address, Hex } from "viem";
import { useFilosignContext } from "../../context/useFilosignContext";
import { ensureAcknowledged } from "../../lib/ack-file/ensure-acknowledged";
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

	const ensureAcknowledgedForPiece = useCallback(
		async (pieceCid: string) => {
			if (!isAuthed || !contracts || !wallet) {
				throw new Error("Wallet connection required");
			}

			const authSubjectCommitment = profile?.authSubjectCommitment;
			if (!authSubjectCommitment) {
				throw new Error(
					"Profile missing Auth subject commitment; try re-login.",
				);
			}

			await ensureAcknowledged(
				{
					contracts,
					wallet,
					rpcQuery,
					authSubjectCommitment,
				},
				pieceCid,
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
					id: placementManifest.documents[0]?.id ?? "welcome-practice-v2",
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

		await ensureAcknowledgedForPiece(pieceCid);
		return pieceCid;
	}, [
		activeOrg?.encryptionPublicKey,
		activeOrg?.id,
		activationQuery,
		ensureAcknowledgedForPiece,
		profile?.email,
		profile?.encryptionPublicKey,
		sendFile,
		wallet,
	]);

	return {
		provision,
		ensureAcknowledged: ensureAcknowledgedForPiece,
		isPending: sendFile.isPending,
		practicePieceCid: activationQuery.data?.practicePieceCid ?? null,
	};
}
