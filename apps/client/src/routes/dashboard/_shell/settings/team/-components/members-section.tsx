import { LinkSimpleIcon } from "@phosphor-icons/react";
import type { Address } from "viem";
import { Button } from "@/src/lib/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/src/lib/components/ui/select";
import { useTeamSettings } from "@/src/routes/dashboard/_shell/settings/team/-lib/context/context";

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
	} = useTeamSettings();

	if (!activeOrgId || !members || members.length === 0) return null;

	return (
		<section className="space-y-3 rounded-lg border border-border p-6">
			<h2 className="text-sm font-medium">Members</h2>
			<ul className="space-y-2 text-sm">
				{members.map((m) => {
					const isSelf =
						myWalletNorm && m.walletAddress.toLowerCase() === myWalletNorm;
					const needsKey = m.hasKeyWrap === false;
					const showDeliver = canInviteMembers && needsKey && !isSelf;
					return (
						<li
							key={m.walletAddress}
							className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2"
						>
							<div className="min-w-0">
								<p className="truncate font-mono text-xs">{m.walletAddress}</p>
								<p className="text-xs text-muted-foreground">
									{m.role} · {m.status}
									{needsKey ? " · key pending" : ""}
								</p>
							</div>
							{canInviteMembers ? (
								<div className="flex items-center gap-2">
									<Select
										value={m.role}
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
										<SelectTrigger className="h-8 w-28">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="owner">owner</SelectItem>
											<SelectItem value="admin">admin</SelectItem>
											<SelectItem value="sender">sender</SelectItem>
											<SelectItem value="viewer">viewer</SelectItem>
										</SelectContent>
									</Select>
									{showDeliver ? (
										<Button
											type="button"
											size="sm"
											variant="outline"
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
											<LinkSimpleIcon className="mr-1 size-3" />
											Deliver org key
										</Button>
									) : null}
									{!isSelf ? (
										<Button
											type="button"
											size="sm"
											variant="destructive"
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
											Remove
										</Button>
									) : null}
								</div>
							) : null}
						</li>
					);
				})}
			</ul>
		</section>
	);
}
