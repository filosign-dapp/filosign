import { MotionReveal } from "@filosign/motion";
import { useFilosignContext } from "@filosign/react";
import { ChartLineIcon, WalletIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SettingsSection } from "@/src/lib/components/settings/section";
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";
import { AdminPageHeader } from "@/src/lib/domains/admin/page-header";
import {
	adminPageRoot,
	documentsPageBodyInset,
} from "@/src/lib/domains/admin/page-layout";
import { useDebouncedSearch } from "@/src/lib/utils/use-debounced-search";

export function AdminMetricsPage() {
	const { rpc, rpcQuery } = useFilosignContext();
	const [senderWallet, setSenderWallet] = useState("");
	const [usageWallet, setUsageWallet] = useState("");
	const [from, setFrom] = useState("");
	const [to, setTo] = useState("");

	const { debouncedSearch: debouncedSenderWallet } = useDebouncedSearch(
		senderWallet.trim() || undefined,
		400,
	);
	const { debouncedSearch: debouncedUsageWallet } = useDebouncedSearch(
		usageWallet.trim() || undefined,
		400,
	);
	const { debouncedSearch: debouncedFrom } = useDebouncedSearch(
		from || undefined,
		400,
	);
	const { debouncedSearch: debouncedTo } = useDebouncedSearch(
		to || undefined,
		400,
	);

	const invitesQuery = useQuery({
		...rpcQuery.metrics.invitesSummary.queryOptions({
			input: {
				...(debouncedSenderWallet
					? { senderWallet: debouncedSenderWallet }
					: {}),
				...(debouncedFrom
					? { from: new Date(debouncedFrom).toISOString() }
					: {}),
				...(debouncedTo ? { to: new Date(debouncedTo).toISOString() } : {}),
			},
		}),
	});

	const usageQuery = useQuery({
		queryKey: rpcQuery.metrics.senderUsage.key({
			input: { wallet: debouncedUsageWallet ?? "" },
		}),
		queryFn: () => {
			if (!debouncedUsageWallet) throw new Error("Wallet required");
			return rpc.metrics.senderUsage({ wallet: debouncedUsageWallet });
		},
		enabled: Boolean(debouncedUsageWallet),
	});

	const summary = invitesQuery.data;

	return (
		<div className={adminPageRoot}>
			<div
				className={`${documentsPageBodyInset} mx-auto w-full max-w-4xl space-y-8`}
			>
				<AdminPageHeader
					title="Platform metrics"
					description="Cold invite funnel and per-wallet entitlement usage."
				/>

				<MotionReveal preset="smooth" delay={0.15} onlyOnce>
					<SettingsSection
						icon={<ChartLineIcon className="size-4" aria-hidden />}
						title="Cold invite funnel"
						description="Filter by sender wallet or date range."
					>
						<div className="space-y-4">
							<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
								<div className="space-y-1.5">
									<Label htmlFor="metrics-sender">
										Sender wallet (optional)
									</Label>
									<Input
										id="metrics-sender"
										value={senderWallet}
										onChange={(e) => setSenderWallet(e.target.value)}
										placeholder="0x…"
									/>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="metrics-from">From (optional)</Label>
									<Input
										id="metrics-from"
										type="date"
										value={from}
										onChange={(e) => setFrom(e.target.value)}
									/>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="metrics-to">To (optional)</Label>
									<Input
										id="metrics-to"
										type="date"
										value={to}
										onChange={(e) => setTo(e.target.value)}
									/>
								</div>
							</div>
							{summary ? (
								<dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-5">
									{(
										[
											["Sent", summary.sent],
											["Claimed", summary.claimed],
											["Pending", summary.pending],
											["Expired", summary.expired],
											["Revoked", summary.revoked],
										] as const
									).map(([label, value]) => (
										<div key={label}>
											<dt className="text-xs text-muted-foreground">{label}</dt>
											<dd className="text-base font-medium tabular-nums text-foreground">
												{value}
											</dd>
										</div>
									))}
								</dl>
							) : invitesQuery.isPending ? (
								<p className="text-sm text-muted-foreground">
									Loading invite metrics…
								</p>
							) : null}
						</div>
					</SettingsSection>
				</MotionReveal>

				<MotionReveal preset="smooth" delay={0.2} onlyOnce>
					<SettingsSection
						icon={<WalletIcon className="size-4" aria-hidden />}
						title="Sender usage snapshot"
						description="Inspect monthly document sends for a wallet."
					>
						<div className="space-y-4">
							<div className="max-w-md space-y-1.5">
								<Label htmlFor="metrics-usage-wallet">Wallet</Label>
								<Input
									id="metrics-usage-wallet"
									value={usageWallet}
									onChange={(e) => setUsageWallet(e.target.value)}
									placeholder="Wallet to inspect"
								/>
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
					</SettingsSection>
				</MotionReveal>
			</div>
		</div>
	);
}
