import {
	useAcceptOrgInvite,
	useActiveOrgId,
	useCloneOrgTemplateToEnvelope,
	useCreateOrganization,
	useInviteOrgMember,
	useOrganizationGet,
	useOrganizations,
	usePublishOrgMemberKeyWrap,
	useRemoveOrgMember,
	useSetOrgMemberRole,
} from "@filosign/react/orgs";
import { BuildingsIcon, LinkSimpleIcon, PlusIcon } from "@phosphor-icons/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Address } from "viem";
import { Button } from "@/src/lib/components/ui/button";
import { Input } from "@/src/lib/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/src/lib/components/ui/select";
import { useSetPersistedActiveOrganizationId } from "@/src/lib/context/persisted-active-org";
import { useStorePersist } from "@/src/lib/hooks/use-store";
import { useThirdwebUserInfo } from "@/src/lib/hooks/use-thirdweb-user-info";
import { copyToClipboard } from "@/src/lib/utils/utils";

function TeamSettingsPage() {
	const { user } = useThirdwebUserInfo();
	const navigate = useNavigate();
	const { setCreateForm } = useStorePersist();
	const myWalletNorm = user?.wallet?.address?.toLowerCase() ?? null;

	const { data, isLoading } = useOrganizations();
	const createOrg = useCreateOrganization();
	const setActiveOrg = useSetPersistedActiveOrganizationId();
	const activeOrgId = useActiveOrgId();
	const [name, setName] = useState("");
	const [inviteEmail, setInviteEmail] = useState("");
	const [inviteTokenPaste, setInviteTokenPaste] = useState("");
	const inviteMember = useInviteOrgMember();
	const acceptInvite = useAcceptOrgInvite();
	const wrapKey = usePublishOrgMemberKeyWrap();
	const setRole = useSetOrgMemberRole();
	const removeMember = useRemoveOrgMember();
	const cloneTemplate = useCloneOrgTemplateToEnvelope();

	const orgDetail = useOrganizationGet(activeOrgId ?? undefined);

	const orgs =
		(
			data as
				| {
						organizations?: Array<{
							id: string;
							name: string;
							role?: string;
						}>;
				  }
				| undefined
		)?.organizations ?? [];

	const activeMembership = useMemo(
		() => orgs.find((o) => o.id === activeOrgId),
		[orgs, activeOrgId],
	);

	const canInviteMembers =
		activeMembership?.role === "owner" || activeMembership?.role === "admin";

	const members = (
		orgDetail.data as
			| {
					members?: Array<{
						walletAddress: string;
						status: string;
						role: string;
						hasKeyWrap?: boolean;
					}>;
			  }
			| undefined
	)?.members;
	const templates = (
		orgDetail.data as
			| {
					templates?: Array<{
						id: string;
						name: string;
					}>;
			  }
			| undefined
	)?.templates;

	return (
		<div className="mx-auto max-w-2xl space-y-8 px-8 py-8">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">Team</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Create an organization to share connections, templates, and documents
					with your team.
				</p>
			</div>

			<section className="space-y-4 rounded-lg border border-border p-6">
				<h2 className="text-sm font-medium">Accept invite</h2>
				<p className="text-xs text-muted-foreground">
					Paste the invite token you received. Your Filosign profile email must
					match the invited address.
				</p>
				<div className="flex flex-col gap-2 sm:flex-row">
					<Input
						placeholder="Invite token"
						value={inviteTokenPaste}
						onChange={(e) => setInviteTokenPaste(e.target.value)}
						className="font-mono text-xs"
					/>
					<Button
						type="button"
						variant="secondary"
						disabled={!inviteTokenPaste.trim() || acceptInvite.isPending}
						onClick={() => {
							acceptInvite.mutate(
								{ token: inviteTokenPaste.trim() },
								{
									onSuccess: (res) => {
										const id = (res as { organizationId?: string })
											.organizationId;
										if (id) setActiveOrg(id);
										setInviteTokenPaste("");
										toast.success("You joined the organization.");
									},
									onError: (e) => {
										toast.error(
											e instanceof Error ? e.message : "Invite failed",
										);
									},
								},
							);
						}}
					>
						Accept
					</Button>
				</div>
			</section>

			<section className="space-y-4 rounded-lg border border-border p-6">
				<h2 className="text-sm font-medium">Active organization</h2>
				{isLoading ? (
					<p className="text-sm text-muted-foreground">Loading…</p>
				) : orgs.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						No organizations yet. Create one below.
					</p>
				) : (
					<Select
						value={activeOrgId ?? "personal"}
						onValueChange={(v) => setActiveOrg(v === "personal" ? null : v)}
					>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Personal workspace" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="personal">Personal workspace</SelectItem>
							{orgs.map((org) => (
								<SelectItem key={org.id} value={org.id}>
									{org.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}
			</section>

			{activeOrgId && canInviteMembers ? (
				<section className="space-y-4 rounded-lg border border-border p-6">
					<h2 className="text-sm font-medium">Invite by email</h2>
					<p className="text-xs text-muted-foreground">
						We store the invite only (no email is sent yet). Share the token
						with your teammate. After they accept, use “Deliver org key” so they
						can open team documents.
					</p>
					<div className="flex flex-col gap-2 sm:flex-row">
						<Input
							type="email"
							placeholder="colleague@company.com"
							value={inviteEmail}
							onChange={(e) => setInviteEmail(e.target.value)}
						/>
						<Button
							type="button"
							disabled={!inviteEmail.includes("@") || inviteMember.isPending}
							onClick={() => {
								inviteMember.mutate(
									{ email: inviteEmail.trim() },
									{
										onSuccess: (raw) => {
											const token = (
												raw as {
													invite?: { token?: string };
												}
											)?.invite?.token;
											setInviteEmail("");
											if (token) {
												toast.success("Invite created — copy the token.");
												void copyToClipboard(token);
											} else {
												toast.success("Invite created.");
											}
										},
										onError: (e) => {
											toast.error(
												e instanceof Error ? e.message : "Invite failed",
											);
										},
									},
								);
							}}
						>
							Create invite
						</Button>
					</div>
				</section>
			) : null}

			{activeOrgId && members && members.length > 0 ? (
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
										<p className="truncate font-mono text-xs">
											{m.walletAddress}
										</p>
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
																toast.error(
																	e instanceof Error
																		? e.message
																		: "Role update failed",
																);
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
																	toast.success("Org key delivered.");
																},
																onError: (e) => {
																	toast.error(
																		e instanceof Error
																			? e.message
																			: "Key delivery failed",
																	);
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
																	toast.success("Member removed.");
																},
																onError: (e) => {
																	toast.error(
																		e instanceof Error
																			? e.message
																			: "Remove failed",
																	);
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
			) : null}

			{activeOrgId && templates && templates.length > 0 ? (
				<section className="space-y-3 rounded-lg border border-border p-6">
					<h2 className="text-sm font-medium">Templates</h2>
					<ul className="space-y-2 text-sm">
						{templates.map((t) => (
							<li
								key={t.id}
								className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2"
							>
								<span>{t.name}</span>
								<Button
									type="button"
									size="sm"
									variant="outline"
									disabled={cloneTemplate.isPending}
									onClick={() => {
										cloneTemplate.mutate(
											{ templateId: t.id },
											{
												onSuccess: (res) => {
													const fields =
														(
															res as {
																placementManifest?: {
																	fields?: Array<{
																		assignedRecipientEmail?: string;
																	}>;
																};
															}
														).placementManifest?.fields ?? [];
													const signerEmails = [
														...new Set(
															fields
																.map((f) =>
																	f.assignedRecipientEmail
																		?.trim()
																		.toLowerCase(),
																)
																.filter((v): v is string => Boolean(v)),
														),
													];
													setCreateForm({
														documents: [
															{
																id: t.id,
																name: (res as { document: { name: string } })
																	.document.name,
																type: "application/pdf",
																size: 0,
																dataUrl: (
																	res as { document: { dataUrl: string } }
																).document.dataUrl,
															},
														],
														recipients: signerEmails.map((email) => ({
															name: email,
															email,
															role: "signer" as const,
														})),
														emailMessage: "",
														emailSubject: "",
													});
													void navigate({
														to: "/dashboard/envelope/create/add-sign",
													});
												},
												onError: (e) => {
													toast.error(
														e instanceof Error
															? e.message
															: "Template clone failed",
													);
												},
											},
										);
									}}
								>
									Use template
								</Button>
							</li>
						))}
					</ul>
				</section>
			) : null}

			<section className="space-y-4 rounded-lg border border-border p-6">
				<div className="flex items-center gap-2">
					<BuildingsIcon className="size-5 text-muted-foreground" />
					<h2 className="text-sm font-medium">Create organization</h2>
				</div>
				<div className="flex gap-2">
					<Input
						placeholder="Organization name"
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
					<Button
						type="button"
						disabled={!name.trim() || createOrg.isPending}
						onClick={() => {
							createOrg.mutate(
								{ name: name.trim() },
								{
									onSuccess: (res) => {
										const id = res.organization?.id;
										if (id) setActiveOrg(id);
										setName("");
									},
								},
							);
						}}
					>
						<PlusIcon className="size-4" />
						Create
					</Button>
				</div>
			</section>
		</div>
	);
}

export const Route = createFileRoute("/dashboard/_shell/settings/team/")({
	component: TeamSettingsPage,
});
