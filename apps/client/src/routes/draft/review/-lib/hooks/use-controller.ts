import { useDecryptDraftReviewCold } from "@filosign/react/drafts";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDraftReviewWarmUnlock } from "@/src/routes/draft/review/-lib/hooks/use-draft-review-warm-unlock";
import { useDraftReviewViewer } from "@/src/routes/draft/review/-lib/hooks/use-viewer";
import type { DecryptedDraftReview } from "@/src/routes/draft/review/-lib/types";

export function useDraftReviewController(token: string) {
	const trimmedToken = token.trim();
	const warmUnlock = useDraftReviewWarmUnlock(token);
	const payload = warmUnlock.payload;
	const decryptCold = useDecryptDraftReviewCold();

	const [coldDecrypted, setColdDecrypted] =
		useState<DecryptedDraftReview | null>(null);
	const [coldPhrase, setColdPhrase] = useState("");

	useEffect(() => {
		setColdDecrypted(null);
		setColdPhrase("");
	}, [token]);

	const data = payload.data;

	const decrypted = useMemo((): DecryptedDraftReview | null => {
		return warmUnlock.decrypted ?? coldDecrypted;
	}, [warmUnlock.decrypted, coldDecrypted]);

	const displayTitle = useMemo((): string | null => {
		if (decrypted?.title?.trim()) return decrypted.title.trim();
		if (data?.title?.trim()) return data.title.trim();
		if (payload.isLoading) return null;
		return "Draft review";
	}, [decrypted?.title, data?.title, payload.isLoading]);

	const viewer = useDraftReviewViewer(
		decrypted?.documents ?? null,
		decrypted?.snapshot ?? null,
	);

	const isUnlocked = Boolean(decrypted);
	const isCold = data?.accessKind === "cold";
	const isWarm = data?.accessKind === "warm";

	const submitColdDecrypt = useCallback(async () => {
		if (data?.accessKind !== "cold" || !coldPhrase.trim()) return;
		try {
			const res = await decryptCold.mutateAsync({
				draftId: data.draftId,
				inviteToken: trimmedToken,
				phrase: coldPhrase.trim(),
				wrappedDek: data.wrappedDek as `0x${string}`,
				snapshotDownloadUrl: data.snapshotDownloadUrl,
				documents: data.documents,
			});
			if (res.documents.length === 0) {
				toast.error("No documents found in draft");
				return;
			}
			setColdDecrypted({
				snapshot: res.snapshot,
				documents: res.documents,
				reviewDek: res.reviewDek,
			});
			toast.success("Draft decrypted successfully");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Decryption failed");
		}
	}, [data, coldPhrase, decryptCold, trimmedToken]);

	return {
		token: trimmedToken,
		payload,
		data,
		isWarm,
		isCold,
		isUnlocked,
		decrypted,
		displayTitle,
		viewer,
		warmUnlock,
		cold: {
			phrase: coldPhrase,
			setPhrase: setColdPhrase,
			submit: submitColdDecrypt,
			isPending: decryptCold.isPending,
		},
	};
}

export type DraftReviewController = ReturnType<typeof useDraftReviewController>;
