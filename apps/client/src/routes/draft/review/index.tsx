import { useDecryptDraftReviewCold } from "@filosign/react/drafts";
import { SpinnerIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
	LazyBoundary,
	LazyPdfJsPreview,
} from "@/src/lib/components/app/suspense";
import { Button } from "@/src/lib/components/ui/button";
import { InlineLoader } from "@/src/lib/components/ui/inline-loader";
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";
import { Textarea } from "@/src/lib/components/ui/textarea";
import { useDraftReviewWarmUnlock } from "@/src/routes/draft/review/-lib/use-draft-review-warm-unlock";

export const Route = createFileRoute("/draft/review/")({
	validateSearch: (search: Record<string, unknown>) => ({
		token: typeof search.token === "string" ? search.token : "",
	}),
	component: DraftReviewPage,
});

function DraftReviewPage() {
	const { token } = Route.useSearch();
	const warmUnlock = useDraftReviewWarmUnlock(token);
	const payload = warmUnlock.payload;
	const decryptCold = useDecryptDraftReviewCold();
	const [phrase, setPhrase] = useState("");
	const [coldPdfBytes, setColdPdfBytes] = useState<Uint8Array | null>(null);

	useEffect(() => {
		setColdPdfBytes(null);
		setPhrase("");
	}, [token]);

	const data = payload.data;
	const pdfBytes = warmUnlock.isWarm ? warmUnlock.pdfBytes : coldPdfBytes;

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

				{!token.trim() ? (
					<p className="text-sm text-destructive">
						Missing review link. Open the link from your email invitation.
					</p>
				) : null}

				{token.trim() && payload.isLoading ? (
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<InlineLoader size="sm" />
						<span>Loading invite…</span>
					</div>
				) : null}

				{token.trim() && payload.isError ? (
					<p className="text-sm text-destructive">
						This review link is invalid or has expired.
					</p>
				) : null}

				{data?.accessKind === "warm" ? (
					<WarmDraftReviewPanel unlock={warmUnlock} />
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
											setColdPdfBytes(doc.bytes);
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

type WarmUnlock = ReturnType<typeof useDraftReviewWarmUnlock>;

function WarmDraftReviewPanel({ unlock }: { unlock: WarmUnlock }) {
	const panel = unlock.warmPanel;

	if (panel === "wrongAccount") {
		return (
			<div className="max-w-md space-y-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
				<p className="font-medium">
					This draft was shared with a different email
				</p>
				<p className="text-muted-foreground">
					Invited: <span className="font-mono">{unlock.inviteEmail}</span>
					<br />
					Signed in as:{" "}
					<span className="font-mono">
						{unlock.signedInEmailForUi || "unknown"}
					</span>
				</p>
				<Button
					type="button"
					variant="outline"
					onClick={() => void unlock.runSwitchAccount()}
				>
					Switch account
				</Button>
			</div>
		);
	}

	if (panel === "recovery") {
		return (
			<div className="max-w-md space-y-3 rounded-md border border-border p-4">
				<div className="space-y-1">
					<p className="font-medium">Unlock encryption keys</p>
					<p className="text-sm text-muted-foreground">
						Your wallet could not unlock this session automatically. Enter your
						24-word Filosign recovery phrase to open this draft.
					</p>
				</div>
				<div className="space-y-2">
					<Label htmlFor="draft-review-recovery">Recovery phrase</Label>
					<Textarea
						id="draft-review-recovery"
						autoComplete="off"
						spellCheck={false}
						rows={5}
						className="font-mono text-sm"
						value={unlock.filosignRecoveryPhrase}
						onChange={(e) => unlock.setFilosignRecoveryPhrase(e.target.value)}
						placeholder="24-word recovery phrase"
					/>
				</div>
				{unlock.decryptError ? (
					<p className="text-sm text-destructive">{unlock.decryptError}</p>
				) : null}
				<Button
					type="button"
					variant="primary"
					disabled={
						unlock.isFilosignRecoveryPending ||
						!unlock.filosignRecoveryPhrase.trim()
					}
					onClick={() => void unlock.submitFilosignRecovery()}
				>
					{unlock.isFilosignRecoveryPending ? (
						<>
							<SpinnerIcon className="mr-2 size-4 animate-spin" />
							Unlocking…
						</>
					) : (
						"Unlock"
					)}
				</Button>
			</div>
		);
	}

	if (panel === "decryptFailed") {
		return (
			<div className="max-w-md space-y-3 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm">
				<p className="font-medium text-destructive">
					Could not open this draft
				</p>
				<p className="text-muted-foreground">{unlock.decryptError}</p>
				<Button
					type="button"
					variant="outline"
					onClick={() => void unlock.retryDecrypt()}
				>
					Try again
				</Button>
			</div>
		);
	}

	if (panel === "needsRegistration") {
		return (
			<p className="text-sm text-destructive">
				This warm review link requires a registered Filosign account. Sign in
				with the invited email or ask the sender for a new invite.
			</p>
		);
	}

	if (
		panel === "signingIn" ||
		panel === "busy" ||
		panel === "unlocking" ||
		panel === "decrypting"
	) {
		return (
			<div className="flex items-center gap-2 text-sm text-muted-foreground">
				<InlineLoader size="sm" />
				<span>{unlock.warmStatusMessage ?? "Loading…"}</span>
			</div>
		);
	}

	return null;
}
