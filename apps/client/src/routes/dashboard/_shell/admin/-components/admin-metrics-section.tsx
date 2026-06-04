import { useFilosignContext } from "@filosign/react";
import { ChartLineIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";

export function AdminMetricsSection(props: { enabled: boolean }) {
	const { rpc, rpcQuery } = useFilosignContext();
	const [senderWallet, setSenderWallet] = useState("");
	const [usageWallet, setUsageWallet] = useState("");

	const invitesQuery = useQuery({
		...rpcQuery.metrics.invitesSummary.queryOptions({
			input: senderWallet.trim() ? { senderWallet: senderWallet.trim() } : {},
		}),
		enabled: props.enabled,
	});

	const usageQuery = useQuery({
		queryKey: rpcQuery.metrics.senderUsage.key({
			input: { wallet: usageWallet.trim() },
		}),
		queryFn: () => {
			const wallet = usageWallet.trim();
			if (!wallet) throw new Error("Wallet required");
			return rpc.metrics.senderUsage({ wallet });
		},
		enabled: props.enabled && usageWallet.trim().length > 0,
	});

	if (!props.enabled) {
		return null;
	}

	const summary = invitesQuery.data;

	return (
		<section className="overflow-hidden rounded-xl border border-border/80 bg-card/40">
			<div className="border-b border-border/60 bg-muted/15 px-6 py-4">
				<div className="flex gap-3">
					<div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background/80 text-muted-foreground">
						<ChartLineIcon className="size-5" aria-hidden />
					</div>
					<div>
						<h2 className="text-base font-medium text-foreground">
							Platform metrics
						</h2>
						<p className="mt-1 text-sm text-muted-foreground">
							Cold invite funnel and per-wallet entitlement usage (admin only).
						</p>
					</div>
				</div>
			</div>
			<div className="space-y-6 p-6">
				<div className="space-y-3">
					<Label htmlFor="metrics-sender-filter">
						Filter cold invites by sender wallet (optional)
					</Label>
					<div className="flex flex-wrap gap-2">
						<Input
							id="metrics-sender-filter"
							value={senderWallet}
							onChange={(e) => setSenderWallet(e.target.value)}
							placeholder="0x…"
							className="max-w-md"
						/>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => void invitesQuery.refetch()}
						>
							Refresh invites
						</Button>
					</div>
					{summary ? (
						<dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
							{(
								[
									["Sent", summary.sent],
									["Claimed", summary.claimed],
									["Pending", summary.pending],
									["Expired", summary.expired],
									["Revoked", summary.revoked],
								] as const
							).map(([label, value]) => (
								<div
									key={label}
									className="rounded-lg border border-border/60 bg-muted/15 px-3 py-2"
								>
									<dt className="text-xs text-muted-foreground">{label}</dt>
									<dd className="text-lg font-semibold tabular-nums">
										{value}
									</dd>
								</div>
							))}
						</dl>
					) : invitesQuery.isLoading ? (
						<p className="text-sm text-muted-foreground">
							Loading invite metrics…
						</p>
					) : null}
				</div>

				<div className="space-y-3 border-t border-border/60 pt-6">
					<Label htmlFor="metrics-usage-wallet">Sender usage snapshot</Label>
					<div className="flex flex-wrap gap-2">
						<Input
							id="metrics-usage-wallet"
							value={usageWallet}
							onChange={(e) => setUsageWallet(e.target.value)}
							placeholder="Wallet to inspect"
							className="max-w-md"
						/>
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={!usageWallet.trim()}
							onClick={() => void usageQuery.refetch()}
						>
							Load usage
						</Button>
					</div>
					{usageQuery.data ? (
						<div className="rounded-lg border border-border/60 bg-muted/15 px-4 py-3 text-sm">
							<p>
								<span className="text-muted-foreground">Plan:</span>{" "}
								{usageQuery.data.planId}
							</p>
							<p className="mt-1">
								<span className="text-muted-foreground">
									Documents this month:
								</span>{" "}
								{usageQuery.data.documentsSentThisMonth}
							</p>
						</div>
					) : usageQuery.isFetching ? (
						<p className="text-sm text-muted-foreground">Loading usage…</p>
					) : null}
				</div>
			</div>
		</section>
	);
}
