import { KeyIcon, UserMinusIcon } from "@phosphor-icons/react";
import type { Address } from "viem";
import { Badge } from "@/src/lib/components/ui/badge";
import { Button } from "@/src/lib/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/src/lib/components/ui/select";
import { cn } from "@/src/lib/utils/index";
import { useWorkspaceSettings } from "@/src/routes/dashboard/_shell/settings/workspace/-lib/context/context";

export function MembersSection() {
	const {
		activeOrgId,
		members,
		myWalletNorm,
		canInviteMembers,
		setRole,
		orgDetail,
		wrapKey,
		removeMember,
	} = useWorkspaceSettings();

	if (!activeOrgId || !members || members.length === 0) return null;

	return (
		<section className="space-y-4 rounded-lg border border-border p-6 bg-card/30">
			<div className="flex items-center justify-between">
				<h2 className="text-sm font-semibold text-foreground">
					Workspace Members
				</h2>
				<Badge variant="secondary">{members.length} total</Badge>
			</div>

			<div className="overflow-x-auto rounded-md border border-border/80 bg-background/50">
				<table className="min-w-full divide-y divide-border text-sm">
					<thead>
						<tr className="bg-muted/10 text-muted-foreground font-medium text-xs text-left">
							<th className="px-4 py-3 font-semibold">Member</th>
							<th className="px-4 py-3 font-semibold">Role</th>
							<th className="px-4 py-3 font-semibold">Status</th>
							{canInviteMembers && (
								<th className="px-4 py-3 font-semibold text-right">Actions</th>
							)}
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{members.map((m) => {
							const isSelf = Boolean(
								myWalletNorm && m.walletAddress.toLowerCase() === myWalletNorm,
							);
							const needsKey = m.hasKeyWrap === false;
							const showDeliver = canInviteMembers && needsKey && !isSelf;

							const displayName =
								m.firstName || m.lastName
									? `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim()
									: m.email || "Pending Invite Setup";

							const contactEmail = m.email || "No email registered";

							return (
								<tr
									key={m.walletAddress}
									className="hover:bg-muted/5 transition-colors"
								>
									<td className="px-4 py-3.5">
										<div className="flex flex-col min-w-0">
											<span className="font-medium text-foreground truncate">
												{displayName}{" "}
												{isSelf && (
													<span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded ml-1 font-normal">
														You
													</span>
												)}
											</span>
											<span className="text-xs text-muted-foreground truncate mt-0.5">
												{contactEmail}
											</span>
										</div>
									</td>
									<td className="px-4 py-3.5">
										{canInviteMembers ? (
											<Select
												value={m.role}
												disabled={isSelf && m.role === "owner"}
												onValueChange={(value) => {
													setRole.mutate(
														{
															walletAddress: m.walletAddress as Address,
															role: value as
																| "owner"
																| "admin"
																| "sender"
																| "viewer",
														},
														{
															onSuccess: () => {
																void orgDetail.refetch();
															},
															onError: (e) => {
																console.error(e);
															},
														},
													);
												}}
											>
												<SelectTrigger className="h-8 w-28 bg-background">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="owner">owner</SelectItem>
													<SelectItem value="admin">admin</SelectItem>
													<SelectItem value="sender">sender</SelectItem>
													<SelectItem value="viewer">viewer</SelectItem>
												</SelectContent>
											</Select>
										) : (
											<span className="capitalize text-muted-foreground text-xs">
												{m.role}
											</span>
										)}
									</td>
									<td className="px-4 py-3.5">
										<div className="flex flex-col gap-1 items-start">
											<Badge
												variant="outline"
												className={cn(
													"capitalize text-[10px] h-5 px-2",
													m.status === "active"
														? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
														: m.status === "invited"
															? "bg-amber-500/10 text-amber-500 border-amber-500/20"
															: "bg-destructive/10 text-destructive border-destructive/20",
												)}
											>
												{m.status}
											</Badge>
											{needsKey && (
												<span className="text-[10px] text-yellow-500 font-medium leading-none mt-1">
													key pending
												</span>
											)}
										</div>
									</td>
									{canInviteMembers && (
										<td className="px-4 py-3.5 text-right">
											<div className="inline-flex items-center gap-2">
												{showDeliver && (
													<Button
														type="button"
														size="sm"
														variant="outline"
														className="h-8 text-xs gap-1 border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10"
														disabled={wrapKey.isPending}
														onClick={() => {
															wrapKey.mutate(
																{
																	targetWallet: m.walletAddress as Address,
																},
																{
																	onSuccess: () => {
																		void orgDetail.refetch();
																	},
																	onError: (e) => {
																		console.error(e);
																	},
																},
															);
														}}
													>
														<KeyIcon className="size-3.5" />
														Grant Access
													</Button>
												)}
												{!isSelf && (
													<Button
														type="button"
														size="sm"
														variant="destructive"
														className="h-8 text-xs gap-1 opacity-80 hover:opacity-100"
														disabled={removeMember.isPending}
														onClick={() => {
															removeMember.mutate(
																{
																	walletAddress: m.walletAddress as Address,
																},
																{
																	onSuccess: () => {
																		void orgDetail.refetch();
																	},
																	onError: (e) => {
																		console.error(e);
																	},
																},
															);
														}}
													>
														<UserMinusIcon className="size-3.5" />
														Remove
													</Button>
												)}
											</div>
										</td>
									)}
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</section>
	);
}
