import { type SubmitEvent, useState } from "react";
import { cn } from "../../lib/cn";
import { useFilosignRpc } from "../../lib/filosign-rpc";
import {
	marketingGhostLgClass,
	marketingPrimaryMdClass,
} from "../../lib/marketing-button";

interface RequestAccessDialogProps {
	open: boolean;
	onClose: () => void;
	planName?: string;
}

export default function RequestAccessDialog({
	open,
	onClose,
	planName,
}: RequestAccessDialogProps) {
	const rpc = useFilosignRpc();
	const [email, setEmail] = useState("");
	const [name, setName] = useState("");
	const [company, setCompany] = useState("");
	const [message, setMessage] = useState("");
	const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">(
		"idle",
	);
	const [error, setError] = useState<string | null>(null);

	if (!open) return null;

	const handleSubmit = async (event: SubmitEvent) => {
		event.preventDefault();
		setStatus("loading");
		setError(null);
		try {
			await rpc.platformAccess.submitAccessRequest({
				email: email.trim(),
				name: name.trim() || undefined,
				company: company.trim() || undefined,
				message:
					[planName ? `Plan interest: ${planName}` : null, message.trim()]
						.filter(Boolean)
						.join("\n") || undefined,
			});
			setStatus("sent");
		} catch (err) {
			setStatus("error");
			setError(err instanceof Error ? err.message : "Something went wrong");
		}
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
			role="dialog"
			aria-modal="true"
			aria-labelledby="access-dialog-title"
		>
			<div className="w-full max-w-md rounded-3xl border border-border/60 bg-background p-6 shadow-xl">
				<h2
					id="access-dialog-title"
					className="text-lg font-medium font-manrope text-foreground"
				>
					Request access
				</h2>
				<p className="mt-2 text-sm text-muted-foreground font-manrope leading-relaxed">
					Team plans are invite-only while we onboard design partners. Tell us
					about your team and we&apos;ll follow up with an invite link.
				</p>

				{status === "sent" ? (
					<div className="mt-6 space-y-4">
						<p className="text-sm text-foreground font-manrope">
							Thanks. We received your request for{" "}
							<strong>{email.trim()}</strong>.
						</p>
						<button
							type="button"
							className={cn(marketingPrimaryMdClass, "w-full")}
							onClick={onClose}
						>
							Close
						</button>
					</div>
				) : (
					<form className="mt-6 space-y-3" onSubmit={handleSubmit}>
						<label className="block space-y-2">
							<span className="text-sm font-medium font-manrope">Email</span>
							<input
								type="email"
								required
								value={email}
								onChange={(event) => setEmail(event.target.value)}
								className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-manrope"
							/>
						</label>
						<label className="block space-y-2">
							<span className="text-sm font-medium font-manrope">Name</span>
							<input
								type="text"
								value={name}
								onChange={(event) => setName(event.target.value)}
								className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-manrope"
							/>
						</label>
						<label className="block space-y-2">
							<span className="text-sm font-medium font-manrope">Company</span>
							<input
								type="text"
								value={company}
								onChange={(event) => setCompany(event.target.value)}
								className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-manrope"
							/>
						</label>
						<label className="block space-y-2">
							<span className="text-sm font-medium font-manrope">
								Anything else?
							</span>
							<textarea
								value={message}
								onChange={(event) => setMessage(event.target.value)}
								rows={3}
								className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-manrope"
							/>
						</label>
						{error ? (
							<p className="text-sm text-destructive font-manrope">{error}</p>
						) : null}
						<div className="flex gap-3 pt-2">
							<button
								type="button"
								className={cn(marketingGhostLgClass, "flex-1")}
								onClick={onClose}
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={status === "loading"}
								className={cn(marketingPrimaryMdClass, "flex-1")}
							>
								{status === "loading" ? "Submitting…" : "Submit request"}
							</button>
						</div>
					</form>
				)}
			</div>
		</div>
	);
}
