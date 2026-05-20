import {
	useAcceptedPeople,
	useApproveSender,
	useCancelRequest,
	useReceivableFrom,
	useReceivedRequests,
	useRejectRequest,
	useSendableTo,
	useSentRequests,
} from "@filosign/react/sharing";
import { useProfilesByAddresses } from "@filosign/react/users";
import { MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { type ComponentProps, useMemo, useState } from "react";
import { type Address, getAddress } from "viem";

import AddRecipientDialog from "@/src/lib/components/shared/AddRecipientDialog";
import { Image } from "@/src/lib/components/shared/Image";
import { Badge } from "@/src/lib/components/ui/badge";
import { Button } from "@/src/lib/components/ui/button";
import { InlineLoader } from "@/src/lib/components/ui/inline-loader";
import { Input } from "@/src/lib/components/ui/input";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/src/lib/components/ui/tabs";
import { cn } from "@/src/lib/utils/index";
import {
	initialsFromName,
	shortWallet,
	WalletCopyButton,
} from "./-components/contact-utils";

type UnifiedContact = {
	wallet: string;
	displayName: string | null;
	avatarUrl: string | null;
	canSendTo: boolean;
	canReceiveFrom: boolean;
};

function buildContacts(
	accepted:
		| {
				people: Array<{
					walletAddress: string | null;
					displayName: string | null;
					avatarUrl: string | null;
				}>;
		  }
		| undefined,
	sendable: Array<{ recipientWallet: string; active: boolean }> | undefined,
	receivable: Array<{ senderWallet: string; active: boolean }> | undefined,
): UnifiedContact[] {
	const map = new Map<string, UnifiedContact>();

	/* Accepted recipients = they accepted your share request → you can send unless chain says revoked */
	for (const p of accepted?.people ?? []) {
		if (!p.walletAddress) continue;
		const k = p.walletAddress.toLowerCase();
		map.set(k, {
			wallet: p.walletAddress,
			displayName: p.displayName,
			avatarUrl: p.avatarUrl,
			canSendTo: true,
			canReceiveFrom: false,
		});
	}

	for (const a of sendable ?? []) {
		const k = a.recipientWallet.toLowerCase();
		const prev = map.get(k);
		if (prev) {
			prev.canSendTo = a.active;
		} else if (a.active) {
			map.set(k, {
				wallet: a.recipientWallet,
				displayName: null,
				avatarUrl: null,
				canSendTo: true,
				canReceiveFrom: false,
			});
		}
	}

	for (const a of receivable ?? []) {
		const k = a.senderWallet.toLowerCase();
		const prev = map.get(k);
		if (prev) {
			prev.canReceiveFrom = a.active;
		} else if (a.active) {
			map.set(k, {
				wallet: a.senderWallet,
				displayName: null,
				avatarUrl: null,
				canSendTo: false,
				canReceiveFrom: true,
			});
		}
	}

	return [...map.values()].sort((a, b) => {
		const an = (a.displayName || a.wallet).toLowerCase();
		const bn = (b.displayName || b.wallet).toLowerCase();
		return an.localeCompare(bn);
	});
}

type SharingRequestRow = {
	id: string;
	senderWallet: string;
	recipientWallet: string;
	message: string | null;
	createdAt: string | Date;
};

/** Incoming first; within each group, newest first. */
function sortPendingRequestRows(
	incoming: SharingRequestRow[],
	outgoing: SharingRequestRow[],
): { direction: "incoming" | "outgoing"; req: SharingRequestRow }[] {
	const rows = [
		...incoming.map((req) => ({ direction: "incoming" as const, req })),
		...outgoing.map((req) => ({ direction: "outgoing" as const, req })),
	];
	rows.sort((a, b) => {
		if (a.direction !== b.direction) {
			return a.direction === "incoming" ? -1 : 1;
		}
		return (
			new Date(b.req.createdAt).getTime() - new Date(a.req.createdAt).getTime()
		);
	});
	return rows;
}

function invalidateSharingQueries(
	queryClient: ReturnType<typeof useQueryClient>,
) {
	queryClient.invalidateQueries({ queryKey: ["received-requests"] });
	queryClient.invalidateQueries({ queryKey: ["sent-requests"] });
	queryClient.invalidateQueries({ queryKey: ["sent-email-invites"] });
	queryClient.invalidateQueries({ queryKey: ["accepted-people"] });
	queryClient.invalidateQueries({ queryKey: ["sendable-to"] });
	queryClient.invalidateQueries({ queryKey: ["receivable-from"] });
	queryClient.invalidateQueries({ queryKey: ["accepted-recipients"] });
}

type ConnectionsTab = "contacts" | "requests";

/** Refetch data for the tab being opened (partial keys match nested query keys). */
function invalidateQueriesForTab(
	queryClient: ReturnType<typeof useQueryClient>,
	tab: ConnectionsTab,
) {
	if (tab === "contacts") {
		queryClient.invalidateQueries({ queryKey: ["accepted-people"] });
		queryClient.invalidateQueries({ queryKey: ["accepted-recipients"] });
		queryClient.invalidateQueries({ queryKey: ["sendable-to"] });
		queryClient.invalidateQueries({ queryKey: ["receivable-from"] });
		queryClient.invalidateQueries({ queryKey: ["fsQ-user-info-by-address"] });
	} else {
		queryClient.invalidateQueries({ queryKey: ["received-requests"] });
		queryClient.invalidateQueries({ queryKey: ["sent-requests"] });
	}
}

function TabCount({ count }: { count: number }) {
	if (count <= 0) return null;
	return <span className="tabular-nums text-muted-foreground">({count})</span>;
}

function EmptyHint({
	title,
	className,
}: {
	title: string;
	className?: string;
}) {
	return (
		<p
			className={cn(
				"py-12 text-center text-sm text-muted-foreground",
				className,
			)}
		>
			{title}
		</p>
	);
}

function ConnectionsPage() {
	const queryClient = useQueryClient();
	const [activeTab, setActiveTab] = useState<ConnectionsTab>("contacts");

	const handleTabChange: NonNullable<
		ComponentProps<typeof Tabs>["onValueChange"]
	> = (next) => {
		const tab = next as ConnectionsTab;
		setActiveTab(tab);
		invalidateQueriesForTab(queryClient, tab);
	};

	const receivedRequests = useReceivedRequests();
	const sentRequests = useSentRequests();
	const acceptedPeople = useAcceptedPeople();
	const sendableTo = useSendableTo();
	const receivableFrom = useReceivableFrom();

	const approveIncoming = useApproveSender();
	const rejectRequest = useRejectRequest();
	const cancelRequest = useCancelRequest();

	const [search, setSearch] = useState("");

	const contacts = useMemo(
		() =>
			buildContacts(acceptedPeople.data, sendableTo.data, receivableFrom.data),
		[acceptedPeople.data, sendableTo.data, receivableFrom.data],
	);

	const recipientAddresses = useMemo(
		() => contacts.map((c) => getAddress(c.wallet as Address)),
		[contacts],
	);

	const profileByWallet = useProfilesByAddresses(
		recipientAddresses.length > 0 ? recipientAddresses : undefined,
	);

	const filteredContacts = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return contacts;
		return contacts.filter((c) => {
			const wallet = c.wallet.toLowerCase();
			const name = (c.displayName || "").toLowerCase();
			const email =
				profileByWallet.data
					?.get(getAddress(c.wallet as Address))
					?.email?.toLowerCase() ?? "";
			return wallet.includes(q) || name.includes(q) || email.includes(q);
		});
	}, [contacts, search, profileByWallet.data]);

	const pendingIncoming =
		receivedRequests.data?.filter((r) => r.status === "PENDING") ?? [];
	const pendingOutgoing =
		sentRequests.data?.filter((r) => r.status === "PENDING") ?? [];

	const pendingWalletCount = pendingIncoming.length + pendingOutgoing.length;

	const sortedPendingRows = useMemo(
		() => sortPendingRequestRows(pendingIncoming, pendingOutgoing),
		[pendingIncoming, pendingOutgoing],
	);

	const loadingContacts =
		acceptedPeople.isLoading ||
		sendableTo.isLoading ||
		receivableFrom.isLoading ||
		profileByWallet.isLoading;

	const loadingRequests = receivedRequests.isLoading || sentRequests.isLoading;

	const tableWrap = "overflow-x-auto";
	const th =
		"border-b border-border py-2 pr-4 text-left text-xs font-medium text-muted-foreground first:pl-0 last:pr-0";
	const td =
		"border-b border-border/80 py-3 pr-4 align-middle first:pl-0 last:pr-0";
	const row = "hover:bg-muted/30";

	return (
		<div className="flex min-h-0 flex-1 flex-col bg-background">
			<div className="border-b border-border px-6 py-5 md:px-8">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div className="min-w-0 space-y-0.5">
						<h1 className="text-base font-semibold text-foreground">
							Connections
						</h1>
						<p className="text-sm text-muted-foreground">
							Add someone by email or manage wallet connection requests.
						</p>
					</div>
					<AddRecipientDialog
						trigger={
							<Button variant="primary" size="sm" className="gap-1.5">
								<PlusIcon className="size-4" weight="bold" />
								Add recipient
							</Button>
						}
						onRequestCompleted={() => invalidateSharingQueries(queryClient)}
					/>
				</div>
			</div>

			<div className="flex min-h-0 flex-1 flex-col px-6 py-5 md:px-8">
				<Tabs
					value={activeTab}
					onValueChange={handleTabChange}
					className="flex min-h-0 flex-1 flex-col gap-0"
				>
					<TabsList className="mb-5 h-9 w-fit max-w-full">
						<TabsTrigger value="contacts" className="min-w-40">
							Connections
						</TabsTrigger>
						<TabsTrigger value="requests" className="min-w-40">
							<span className="flex items-center gap-1.5">
								Requests
								<TabCount count={pendingWalletCount} />
							</span>
						</TabsTrigger>
					</TabsList>

					<TabsContent value="contacts" className="mt-0 flex-1 outline-none">
						<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<p className="text-xs text-muted-foreground">
								{contacts.length}{" "}
								{contacts.length === 1 ? "recipient" : "recipients"}
							</p>
							<div className="relative w-full max-w-xs">
								<MagnifyingGlassIcon
									className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
									weight="regular"
								/>
								<Input
									type="search"
									placeholder="Search…"
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									className="h-8 border-border/80 bg-transparent pl-8 text-sm"
								/>
							</div>
						</div>

						<div className={tableWrap}>
							{loadingContacts ? (
								<div className="flex justify-center py-16">
									<InlineLoader />
								</div>
							) : filteredContacts.length === 0 ? (
								<EmptyHint
									title={
										contacts.length === 0
											? "No recipients yet. Use Add recipient to invite someone."
											: "No matches."
									}
								/>
							) : (
								<table className="w-full min-w-[640px] border-collapse text-sm">
									<thead>
										<tr>
											<th className={th}>Recipient</th>
											<th className={cn(th, "hidden md:table-cell")}>Email</th>
											<th className={cn(th, "hidden lg:table-cell")}>Wallet</th>
											<th className={th}>Sharing</th>
										</tr>
									</thead>
									<tbody>
										{filteredContacts.map((c) => {
											const rowEmail =
												profileByWallet.data?.get(
													getAddress(c.wallet as Address),
												)?.email ?? null;
											return (
												<tr key={c.wallet} className={row}>
													<td className={td}>
														<div className="flex items-center gap-2.5">
															<div className="flex size-8 shrink-0 overflow-hidden rounded-full bg-muted">
																{c.avatarUrl ? (
																	<Image
																		src={c.avatarUrl}
																		alt=""
																		className="size-8 object-cover"
																		width={32}
																		height={32}
																	/>
																) : (
																	<span className="flex size-8 items-center justify-center text-[11px] font-medium text-muted-foreground">
																		{initialsFromName(c.displayName, c.wallet)}
																	</span>
																)}
															</div>
															<div className="min-w-0">
																<div className="truncate font-medium">
																	{c.displayName || shortWallet(c.wallet)}
																</div>
																{rowEmail ? (
																	<div className="truncate text-xs text-muted-foreground md:hidden">
																		{rowEmail}
																	</div>
																) : null}
																<div className="truncate font-mono text-xs text-muted-foreground lg:hidden">
																	{shortWallet(c.wallet)}
																</div>
															</div>
														</div>
													</td>
													<td
														className={cn(
															td,
															"hidden max-w-[220px] truncate md:table-cell",
														)}
													>
														<span className="text-muted-foreground">
															{rowEmail ?? "—"}
														</span>
													</td>
													<td className={cn(td, "hidden lg:table-cell")}>
														<div className="flex items-center gap-1">
															<span className="font-mono text-xs text-muted-foreground">
																{shortWallet(c.wallet)}
															</span>
															<WalletCopyButton address={c.wallet} />
														</div>
													</td>
													<td className={td}>
														<div className="flex flex-wrap gap-1">
															{c.canSendTo ? (
																<Badge
																	variant="secondary"
																	className="text-[10px] font-normal"
																>
																	You can send
																</Badge>
															) : null}
															{c.canReceiveFrom ? (
																<Badge
																	variant="secondary"
																	className="text-[10px] font-normal"
																>
																	Can send to you
																</Badge>
															) : null}
															{!c.canSendTo && !c.canReceiveFrom ? (
																<span className="text-xs text-muted-foreground">
																	—
																</span>
															) : null}
														</div>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							)}
						</div>
					</TabsContent>

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
											<th className={cn(th, "hidden md:table-cell")}>
												Message
											</th>
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
															{direction === "incoming"
																? "Incoming"
																: "Outgoing"}
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
														{new Date(req.createdAt).toLocaleDateString(
															undefined,
															{ dateStyle: "medium" },
														)}
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
																	onClick={() =>
																		rejectRequest.mutateAsync(req.id)
																	}
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
																onClick={() =>
																	cancelRequest.mutateAsync(req.id)
																}
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
				</Tabs>
			</div>
		</div>
	);
}

import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/dashboard/_shell/connections/")({
	component: ConnectionsPage,
});
