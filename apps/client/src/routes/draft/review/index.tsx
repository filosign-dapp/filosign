import {
	useDecryptDraftReviewCold,
	useDecryptDraftReviewWarm,
	useDraftReviewByToken,
} from "@filosign/react/drafts";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
	LazyBoundary,
	LazyPdfJsPreview,
} from "@/src/lib/components/app/suspense";
import { Button } from "@/src/lib/components/ui/button";
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";

export const Route = createFileRoute("/draft/review/")({
	validateSearch: (search: Record<string, unknown>) => ({
		token: typeof search.token === "string" ? search.token : "",
	}),
	component: DraftReviewPage,
});

function DraftReviewPage() {
	const { token } = Route.useSearch();
	const payload = useDraftReviewByToken(token);
	const decryptCold = useDecryptDraftReviewCold();
	const decryptWarm = useDecryptDraftReviewWarm();
	const [phrase, setPhrase] = useState("");
	const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);

	useEffect(() => {
		setPdfBytes(null);
	}, [token]);

	const data = payload.data;

	return (
		<div className="min-h-screen bg-background p-6">
			<div className="mx-auto max-w-4xl space-y-6">
				<header>
					<h1 className="text-xl font-semibold">
						{data?.title ?? "Draft review"}
					</h1>
					<p className="text-sm text-muted-foreground">
						View-only preview. Signing and settlements are not available until
						the sender sends the envelope.
					</p>
				</header>

				{data?.accessKind === "warm" ? (
					<Button
						type="button"
						variant="primary"
						disabled={decryptWarm.isPending}
						onClick={() => {
							void decryptWarm
								.mutateAsync({ inviteToken: token })
								.then((res) => {
									const doc = res.documents[0];
									if (doc) {
										setPdfBytes(doc.bytes);
										toast.success("Draft decrypted successfully");
									} else {
										toast.error("No documents found in draft");
									}
								})
								.catch((err) => {
									toast.error(
										err instanceof Error ? err.message : "Decryption failed",
									);
								});
						}}
					>
						{decryptWarm.isPending ? "Unlocking…" : "Unlock with wallet"}
					</Button>
				) : null}

				{data?.accessKind === "cold" ? (
					<div className="space-y-3 max-w-md">
						<div className="space-y-2">
							<Label htmlFor="draft-review-phrase">Secret code</Label>
							<Input
								id="draft-review-phrase"
								value={phrase}
								onChange={(e) => setPhrase(e.target.value)}
								placeholder="Enter the code from the sender"
							/>
						</div>
						<Button
							type="button"
							variant="primary"
							disabled={decryptCold.isPending || !phrase.trim()}
							onClick={() => {
								if (data.accessKind !== "cold") return;
								void decryptCold
									.mutateAsync({
										draftId: data.draftId,
										inviteToken: token,
										phrase: phrase.trim(),
										wrappedDek: data.wrappedDek as `0x${string}`,
										snapshotDownloadUrl: data.snapshotDownloadUrl,
										documents: data.documents,
									})
									.then((res) => {
										const doc = res.documents[0];
										if (doc) {
											setPdfBytes(doc.bytes);
											toast.success("Draft decrypted successfully");
										} else {
											toast.error("No documents found in draft");
										}
									})
									.catch((err) => {
										toast.error(
											err instanceof Error ? err.message : "Decryption failed",
										);
									});
							}}
						>
							{decryptCold.isPending ? "Decrypting…" : "View draft"}
						</Button>
					</div>
				) : null}

				{pdfBytes ? (
					<div className="relative h-[70vh] rounded-lg border border-border overflow-hidden">
						<LazyBoundary>
							<LazyPdfJsPreview
								documentKey={token}
								file={pdfBytes}
								pageNumber={1}
								width={720}
								maxHeight={900}
							/>
						</LazyBoundary>
					</div>
				) : null}
			</div>
		</div>
	);
}
