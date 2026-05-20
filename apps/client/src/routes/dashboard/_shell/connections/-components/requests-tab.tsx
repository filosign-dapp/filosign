import type { Address } from "viem";
import { Badge } from "@/src/lib/components/ui/badge";
import { Button } from "@/src/lib/components/ui/button";
import { InlineLoader } from "@/src/lib/components/ui/inline-loader";
import { TabsContent } from "@/src/lib/components/ui/tabs";
import { cn } from "@/src/lib/utils/index";
import {
	shortWallet,
	WalletCopyButton,
} from "@/src/routes/dashboard/_shell/connections/-components/contact-utils";
import { EmptyHint } from "@/src/routes/dashboard/_shell/connections/-components/empty-hint";
import { useConnectionsContext } from "@/src/routes/dashboard/_shell/connections/-lib/context/context";
import {
	row,
	tableWrap,
	td,
	th,
} from "@/src/routes/dashboard/_shell/connections/-lib/utils/table-styles";

export function RequestsTab() {
	const {
		sortedPendingRows,
		loadingRequests,
		approveIncoming,
		rejectRequest,
		cancelRequest,
	} = useConnectionsContext();

	return (
		<TabsContent value="requests" className="mt-0 flex-1 outline-none">
			<div className={tableWrap}>
				{loadingRequests ? (
					<div className="flex justify-center py-16">
						<InlineLoader />
					</div>
				) : sortedPendingRows.length === 0 ? (
					<EmptyHint title="No pending requests." />
				) : (
					<table className="w-full min-w-[560px] border-collapse text-sm">
						<thead>
							<tr>
								<th className={th}>Direction</th>
								<th className={th}>Wallet</th>
								<th className={cn(th, "hidden md:table-cell")}>Message</th>
								<th className={th}>Date</th>
								<th className={cn(th, "text-right")}> </th>
							</tr>
						</thead>
						<tbody>
							{sortedPendingRows.map(({ direction, req }) => {
								const counterparty =
									direction === "incoming"
										? req.senderWallet
										: req.recipientWallet;
								return (
									<tr key={`${direction}-${req.id}`} className={row}>
										<td className={td}>
											<Badge
												variant="secondary"
												className="text-[10px] font-normal"
											>
												{direction === "incoming" ? "Incoming" : "Outgoing"}
											</Badge>
										</td>
										<td className={td}>
											<div className="flex items-center gap-1.5">
												<span className="font-mono text-sm">
													{shortWallet(counterparty)}
												</span>
												<WalletCopyButton address={counterparty} />
											</div>
											{req.message ? (
												<p className="mt-1 text-xs text-muted-foreground md:hidden">
													{req.message}
												</p>
											) : null}
										</td>
										<td className={cn(td, "hidden md:table-cell")}>
											<p className="max-w-sm text-muted-foreground">
												{req.message || "—"}
											</p>
										</td>
										<td
											className={cn(
												td,
												"whitespace-nowrap text-xs text-muted-foreground",
											)}
										>
											{new Date(req.createdAt).toLocaleDateString(undefined, {
												dateStyle: "medium",
											})}
										</td>
										<td className={cn(td, "text-right")}>
											{direction === "incoming" ? (
												<div className="flex justify-end gap-2">
													<Button
														type="button"
														size="sm"
														variant="outline"
														className="h-8 text-muted-foreground"
														disabled={rejectRequest.isPending}
														onClick={() => rejectRequest.mutateAsync(req.id)}
													>
														Decline
													</Button>
													<Button
														type="button"
														size="sm"
														variant="primary"
														className="h-8"
														disabled={approveIncoming.isPending}
														onClick={() =>
															approveIncoming.mutateAsync({
																sender: req.senderWallet as Address,
																establishMutualConnection: true,
																shareRequestId: req.id,
															})
														}
													>
														Accept
													</Button>
												</div>
											) : (
												<Button
													type="button"
													size="sm"
													variant="ghost"
													className="h-8 text-muted-foreground"
													disabled={cancelRequest.isPending}
													onClick={() => cancelRequest.mutateAsync(req.id)}
												>
													Cancel
												</Button>
											)}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				)}
			</div>
		</TabsContent>
	);
}
