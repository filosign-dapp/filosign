import { useShareDraftExternal } from "@filosign/react/drafts";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/src/lib/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/src/lib/components/ui/dialog";
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";
export function ShareDraftDialog(props: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	draftId: string;
}) {
	const [emailsRaw, setEmailsRaw] = useState("");
	const [phrases, setPhrases] = useState<{ email: string; phrase: string }[]>(
		[],
	);
	const share = useShareDraftExternal();

	return (
		<Dialog open={props.open} onOpenChange={props.onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Share draft for review</DialogTitle>
					<DialogDescription>
						Invite external reviewers by email. Team members already have access
						via your organization workspace.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-2">
					<Label htmlFor="draft-share-emails">External emails</Label>
					<Input
						id="draft-share-emails"
						placeholder="client@example.com, counsel@firm.com"
						value={emailsRaw}
						onChange={(e) => setEmailsRaw(e.target.value)}
					/>
				</div>
				{phrases.length > 0 ? (
					<div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
						<p className="font-medium">Secret codes (share separately)</p>
						<ul className="mt-2 space-y-1">
							{phrases.map((row) => (
								<li key={row.email}>
									<span className="text-muted-foreground">{row.email}:</span>{" "}
									<code className="text-xs">{row.phrase}</code>
								</li>
							))}
						</ul>
					</div>
				) : null}
				<DialogFooter>
					<Button
						type="button"
						variant="primary"
						disabled={share.isPending || !emailsRaw.trim()}
						onClick={() => {
							const emails = emailsRaw
								.split(/[,;\s]+/)
								.map((e) => e.trim())
								.filter(Boolean);
							share.mutate(
								{
									draftId: props.draftId,
									emails,
								},
								{
									onSuccess: (result) => {
										const cold = result.shares
											.filter((s) => s.phrase)
											.map((s) => ({
												email: s.email,
												phrase: s.phrase as string,
											}));
										setPhrases(cold);
										toast.success("Review invites sent");
									},
									onError: (err) => {
										toast.error(
											err instanceof Error ? err.message : "Share failed",
										);
									},
								},
							);
						}}
					>
						{share.isPending ? "Sending…" : "Send invites"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
