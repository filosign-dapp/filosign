import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import type { Address } from "viem";
import { getAddress } from "viem";
import { Image } from "@/src/lib/components/app/media/image";
import { Badge } from "@/src/lib/components/ui/badge";
import { InlineLoader } from "@/src/lib/components/ui/inline-loader";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/src/lib/components/ui/input-group";
import { TabsContent } from "@/src/lib/components/ui/tabs";
import { cn } from "@/src/lib/utils/index";
import {
	initialsFromName,
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

export function ContactsTab() {
	const {
		contacts,
		filteredContacts,
		profileByWallet,
		search,
		setSearch,
		loadingContacts,
	} = useConnectionsContext();

	return (
		<TabsContent value="contacts" className="mt-0 flex-1 outline-none">
			<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<p className="text-xs text-muted-foreground">
					{contacts.length} {contacts.length === 1 ? "recipient" : "recipients"}
				</p>
				<InputGroup className="h-8 w-full max-w-xs border-border/80 bg-transparent">
					<InputGroupAddon align="inline-start">
						<MagnifyingGlassIcon
							className="size-4 text-muted-foreground"
							weight="regular"
						/>
					</InputGroupAddon>
					<InputGroupInput
						type="search"
						placeholder="Search…"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="text-sm"
					/>
				</InputGroup>
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
									profileByWallet.data?.get(getAddress(c.wallet as Address))
										?.email ?? null;
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
	);
}
