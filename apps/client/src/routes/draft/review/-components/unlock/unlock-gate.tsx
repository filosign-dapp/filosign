import { Button } from "@/src/lib/components/ui/button";
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";
import { InlineLoader } from "@/src/lib/components/ui/loader";
import { Textarea } from "@/src/lib/components/ui/textarea";
import {
	useDraftReviewColdSlice,
	useDraftReviewMeta,
	useDraftReviewWarmSlice,
} from "@/src/routes/draft/review/-lib/context/context";
import type { useDraftReviewWarmUnlock } from "@/src/routes/draft/review/-lib/hooks/use-draft-review-warm-unlock";

type WarmUnlock = ReturnType<typeof useDraftReviewWarmUnlock>;

function WarmDraftReviewPanel({ unlock }: { unlock: WarmUnlock }) {
	const panel = unlock.warmPanel;

	if (panel === "wrongAccount") {
		return (
			<div className="w-full max-w-md space-y-3 rounded-large border border-amber-500/40 bg-amber-500/10 p-5 text-sm">
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
			<div className="w-full max-w-md space-y-3 rounded-large border border-border bg-card p-5 shadow-sm">
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
							<InlineLoader size="sm" className="mr-2 text-current" />
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
			<div className="w-full max-w-md space-y-3 rounded-large border border-destructive/40 bg-destructive/5 p-5 text-sm">
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
			<p className="max-w-md text-center text-sm text-destructive">
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
			<div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
				<InlineLoader size="lg" />
				<span>{unlock.warmStatusMessage ?? "Loading…"}</span>
			</div>
		);
	}

	return null;
}

function ColdUnlockPanel() {
	const cold = useDraftReviewColdSlice();

	return (
		<div className="w-full max-w-md space-y-4 rounded-large border border-border bg-card p-5 shadow-sm">
			<div className="space-y-1">
				<p className="font-medium">Enter your secret code</p>
				<p className="text-sm text-muted-foreground">
					Use the code from the sender to decrypt and preview this draft.
				</p>
			</div>
			<div className="space-y-2">
				<Label htmlFor="draft-review-phrase">Secret code</Label>
				<Input
					id="draft-review-phrase"
					value={cold.phrase}
					onChange={(e) => cold.setPhrase(e.target.value)}
					placeholder="Enter the code from the sender"
					onKeyDown={(e) => {
						if (e.key === "Enter" && cold.phrase.trim()) {
							void cold.submit();
						}
					}}
				/>
			</div>
			<Button
				type="button"
				variant="primary"
				className="w-full"
				disabled={cold.isPending || !cold.phrase.trim()}
				onClick={() => void cold.submit()}
			>
				{cold.isPending ? "Decrypting…" : "View draft"}
			</Button>
		</div>
	);
}

export function DraftReviewUnlockGate() {
	const { payload, isWarm, isCold } = useDraftReviewMeta();
	const warmUnlock = useDraftReviewWarmSlice();

	if (payload.isLoading) {
		return (
			<div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
				<InlineLoader size="lg" />
				<span>Loading invite…</span>
			</div>
		);
	}

	if (payload.isError) {
		return (
			<p className="max-w-md text-center text-sm text-destructive">
				This review link is invalid or has expired.
			</p>
		);
	}

	if (isWarm) {
		return <WarmDraftReviewPanel unlock={warmUnlock} />;
	}

	if (isCold) {
		return <ColdUnlockPanel />;
	}

	return null;
}
