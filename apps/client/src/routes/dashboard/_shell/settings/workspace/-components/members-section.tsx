import {
	DotsThreeVerticalIcon,
	KeyIcon,
	PlusIcon,
	UserMinusIcon,
	UsersIcon,
} from "@phosphor-icons/react";
import type { Address } from "viem";
import { Avatar, AvatarFallback } from "@/src/lib/components/ui/avatar";
import { Button } from "@/src/lib/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuPortal,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/src/lib/components/ui/dropdown-menu";
import { cn } from "@/src/lib/utils/index";
import { useWorkspaceSettings } from "@/src/routes/dashboard/_shell/settings/workspace/-lib/context/context";
import { WorkspaceSection } from "./workspace-section";

function initialsFromName(
	firstName?: string | null,
	lastName?: string | null,
	email?: string | null,
) {
	if (firstName || lastName) {
		return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
	}
	if (email) {
		return email[0].toUpperCase();
	}
	return "?";
}

export function MembersSection(props: { onInviteClick?: () => void }) {
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
		<WorkspaceSection
			icon={<UsersIcon className="size-4" aria-hidden="true" />}
			title={`Team Members`}
			description="Everyone with access to this workspace. Pending invites count toward your paid seat limit until they are rejected or revoked."
			headerAside={
				canInviteMembers && props.onInviteClick ? (
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-8 rounded-lg text-xs gap-1.5 touch-manipulation cursor-pointer"
						onClick={props.onInviteClick}
					>
						<PlusIcon className="size-3.5" aria-hidden="true" />
						Add member
					</Button>
				) : null
			}
		>
			<div className="overflow-x-auto rounded-lg border border-border/80 bg-background/50">
				<table className="min-w-full divide-y divide-border text-sm">
					<thead>
						<tr className="bg-muted/10 text-left text-xs font-medium text-muted-foreground">
							<th scope="col" className="px-4 py-3 font-semibold">
								Member
							</th>
							<th scope="col" className="px-4 py-3 font-semibold">
								Role
							</th>
							<th scope="col" className="px-4 py-3 font-semibold">
								Status
							</th>
							{canInviteMembers ? (
								<th scope="col" className="px-4 py-3 text-right font-semibold">
									Actions
								</th>
							) : null}
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
									: m.email || "Pending invite";

							const contactEmail = m.email || "No email on file";

							return (
								<tr
									key={m.walletAddress}
									className="transition-colors hover:bg-muted/5"
								>
									<td className="px-4 py-3.5">
										<div className="flex items-center gap-3">
											<Avatar size="default" className="size-8">
												<AvatarFallback className="bg-primary/5 text-primary text-xs font-semibold">
													{initialsFromName(m.firstName, m.lastName, m.email)}
												</AvatarFallback>
											</Avatar>
											<div className="flex min-w-0 flex-col">
												<span className="truncate font-medium text-foreground">
													{displayName}{" "}
													{isSelf ? (
														<span className="ml-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-normal text-primary">
															You
														</span>
													) : null}
												</span>
												<span className="truncate text-xs text-muted-foreground">
													{contactEmail}
												</span>
											</div>
										</div>
									</td>
									<td className="px-4 py-3.5">
										<span className="text-xs font-medium capitalize text-muted-foreground">
											{m.role}
										</span>
									</td>
									<td className="px-4 py-3.5">
										<div className="flex flex-col items-start gap-1">
											<div className="flex items-center gap-1.5 text-xs font-medium">
												<span
													className={cn(
														"size-1.5 rounded-full",
														m.status === "active"
															? "bg-secondary"
															: m.status === "invited"
																? "bg-warning animate-pulse"
																: "bg-destructive",
													)}
													aria-hidden="true"
												/>
												<span className="capitalize text-muted-foreground">
													{m.status}
												</span>
											</div>
											{needsKey ? (
												<span className="text-[10px] font-medium leading-none text-warning">
													Encryption key pending
												</span>
											) : null}
										</div>
									</td>
									{canInviteMembers ? (
										<td className="px-4 py-3.5 text-right">
											{showDeliver || !isSelf ? (
												<DropdownMenu>
													<DropdownMenuTrigger
														render={
															<Button
																type="button"
																variant="outline"
																size="icon"
																className="size-8 rounded-lg touch-manipulation cursor-pointer"
																aria-label="Actions"
															>
																<DotsThreeVerticalIcon
																	className="size-4 text-muted-foreground"
																	aria-hidden="true"
																/>
															</Button>
														}
													/>
													<DropdownMenuContent align="end" className="w-44">
														{!isSelf && (
															<>
																<DropdownMenuSub>
																	<DropdownMenuSubTrigger className="gap-2 cursor-pointer">
																		<UsersIcon
																			className="size-4"
																			aria-hidden="true"
																		/>
																		<span>Change role</span>
																	</DropdownMenuSubTrigger>
																	<DropdownMenuPortal>
																		<DropdownMenuSubContent className="w-32">
																			{(
																				[
																					"owner",
																					"admin",
																					"sender",
																					"viewer",
																				] as const
																			).map((r) => (
																				<DropdownMenuItem
																					key={r}
																					disabled={m.role === r}
																					onClick={() => {
																						setRole.mutate(
																							{
																								walletAddress:
																									m.walletAddress as Address,
																								role: r,
																							},
																							{
																								onSuccess: () =>
																									void orgDetail.refetch(),
																								onError: (e) =>
																									console.error(e),
																							},
																						);
																					}}
																					className="capitalize cursor-pointer"
																				>
																					{r}
																				</DropdownMenuItem>
																			))}
																		</DropdownMenuSubContent>
																	</DropdownMenuPortal>
																</DropdownMenuSub>
																{(showDeliver || !isSelf) && (
																	<DropdownMenuSeparator />
																)}
															</>
														)}
														{showDeliver && (
															<DropdownMenuItem
																disabled={wrapKey.isPending}
																onClick={() => {
																	wrapKey.mutate(
																		{
																			targetWallet: m.walletAddress as Address,
																		},
																		{
																			onSuccess: () => void orgDetail.refetch(),
																			onError: (e) => console.error(e),
																		},
																	);
																}}
																className="gap-2 cursor-pointer"
															>
																<KeyIcon
																	className="size-4"
																	aria-hidden="true"
																/>
																<span>Grant access</span>
															</DropdownMenuItem>
														)}
														{showDeliver && !isSelf && (
															<DropdownMenuSeparator />
														)}
														{!isSelf && (
															<DropdownMenuItem
																disabled={removeMember.isPending}
																onClick={() => {
																	removeMember.mutate(
																		{
																			walletAddress: m.walletAddress as Address,
																		},
																		{
																			onSuccess: () => void orgDetail.refetch(),
																			onError: (e) => console.error(e),
																		},
																	);
																}}
																className="gap-2 text-destructive focus:text-destructive cursor-pointer"
															>
																<UserMinusIcon
																	className="size-4"
																	aria-hidden="true"
																/>
																<span>Remove</span>
															</DropdownMenuItem>
														)}
													</DropdownMenuContent>
												</DropdownMenu>
											) : null}
										</td>
									) : null}
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
			<p className="mt-4 text-xs italic text-muted-foreground">
				Everyone with access to this workspace. Pending invites count towards
				your seat limit.
			</p>
		</WorkspaceSection>
	);
}
