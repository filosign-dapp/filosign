import { useSetPrimaryEmail, useUserProfile } from "@filosign/react/users";
import {
	EnvelopeSimpleIcon,
	GoogleLogoIcon,
	PlusIcon,
	StarIcon,
	TrashIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import {
	useAuthToken,
	useLinkProfile,
	useProfiles,
	useUnlinkProfile,
	useWalletDetailsModal,
} from "thirdweb/react";
import type { Profile } from "thirdweb/wallets";
import { Button } from "@/src/lib/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/src/lib/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/src/lib/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/src/lib/components/ui/tooltip";
import { thirdwebClient } from "@/src/lib/thirdweb/client";
import { thirdwebWalletModalOptions } from "@/src/lib/thirdweb/wallet-modal-options";

type LinkedRow = {
	key: string;
	kind: "email" | "google";
	email: string;
	profile: Profile;
};

function rowsFromProfiles(profiles: Profile[] | undefined): LinkedRow[] {
	if (!profiles?.length) return [];
	const out: LinkedRow[] = [];
	for (const profile of profiles) {
		if (profile.type === "email" && profile.details.email?.trim()) {
			const email = profile.details.email.trim();
			out.push({
				key: `email:${email.toLowerCase()}`,
				kind: "email",
				email,
				profile,
			});
		}
		if (profile.type === "google" && profile.details.email?.trim()) {
			const email = profile.details.email.trim();
			const id =
				"id" in profile.details && profile.details.id
					? String(profile.details.id)
					: email;
			out.push({
				key: `google:${id}`,
				kind: "google",
				email,
				profile,
			});
		}
	}
	return out;
}

function ProviderIcon({ kind }: { kind: LinkedRow["kind"] }) {
	if (kind === "google") {
		return (
			<GoogleLogoIcon
				className="size-4 shrink-0 text-muted-foreground/70"
				weight="regular"
			/>
		);
	}
	return (
		<EnvelopeSimpleIcon
			className="size-4 shrink-0 text-muted-foreground/70"
			weight="regular"
		/>
	);
}

const iconButton =
	"size-8 text-muted-foreground hover:text-foreground hover:bg-muted/60";

export function LinkedAccountsSection() {
	const authToken = useAuthToken();
	const { data: profiles } = useProfiles({ client: thirdwebClient });
	const { mutate: linkProfile } = useLinkProfile();
	const walletDetailsModal = useWalletDetailsModal();
	const { mutateAsync: unlinkProfile } = useUnlinkProfile();
	const { data: profile } = useUserProfile();
	const setPrimary = useSetPrimaryEmail();

	const connections = rowsFromProfiles(profiles);
	const primaryNormalized = profile?.email?.trim().toLowerCase() ?? "";
	const canUnlinkAny = connections.length > 1;

	const handleMakePrimary = async (email: string) => {
		if (!authToken) {
			toast.error("Session expired. Sign in again and retry.");
			return;
		}
		try {
			await setPrimary.mutateAsync({ identityToken: authToken, email });
			toast.success("Primary email updated.");
		} catch (e) {
			const message =
				e instanceof Error ? e.message : "Could not update primary email.";
			toast.error(message);
		}
	};

	const handleUnlink = async (row: LinkedRow) => {
		if (!canUnlinkAny) {
			toast.error("Add another way to sign in before removing this one.");
			return;
		}
		try {
			await unlinkProfile({
				client: thirdwebClient,
				profileToUnlink: row.profile,
			});
			toast.success(
				row.kind === "email"
					? "Email sign-in removed."
					: "Google account disconnected.",
			);
		} catch (e) {
			const message =
				e instanceof Error ? e.message : "Could not remove this account.";
			toast.error(message);
		}
	};

	return (
		<TooltipProvider delay={300}>
			<Card className="border-border/50 shadow-none">
				<CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-3">
					<CardTitle className="text-sm font-medium text-foreground/85">
						Linked accounts
					</CardTitle>
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="h-8 gap-1.5 px-2.5 text-sm font-normal text-muted-foreground hover:bg-muted/60 hover:text-foreground"
								/>
							}
						>
							<PlusIcon className="size-4 shrink-0" weight="bold" />
							<span>Link account</span>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="min-w-40">
							<DropdownMenuItem
								className="gap-2 cursor-pointer text-muted-foreground focus:text-foreground"
								onClick={() =>
									walletDetailsModal.open(thirdwebWalletModalOptions)
								}
							>
								<EnvelopeSimpleIcon className="size-4 opacity-70" />
								More sign-in options
							</DropdownMenuItem>
							<DropdownMenuItem
								className="gap-2 cursor-pointer text-muted-foreground focus:text-foreground"
								onClick={() =>
									linkProfile({
										client: thirdwebClient,
										strategy: "google",
									})
								}
							>
								<GoogleLogoIcon className="size-4 opacity-70" />
								Google
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</CardHeader>
				<CardContent className="pt-0">
					{connections.length === 0 ? (
						<p className="text-sm text-muted-foreground/80">None linked yet.</p>
					) : (
						<ul className="divide-y divide-border/50">
							{connections.map((row) => {
								const isPrimary =
									row.email.toLowerCase() === primaryNormalized &&
									primaryNormalized.length > 0;
								return (
									<li
										key={row.key}
										className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
									>
										<ProviderIcon kind={row.kind} />
										<div className="min-w-0 flex-1 flex items-center gap-2">
											<span className="truncate text-sm text-foreground/85">
												{row.email}
											</span>
											{isPrimary ? (
												<StarIcon
													className="size-3.5 shrink-0 text-muted-foreground/60"
													weight="fill"
													aria-hidden
												/>
											) : null}
										</div>
										<div className="flex items-center gap-0.5 shrink-0">
											<Tooltip>
												<TooltipTrigger
													render={
														<Button
															type="button"
															variant="ghost"
															size="icon-sm"
															className={iconButton}
															disabled={
																isPrimary || setPrimary.isPending || !authToken
															}
															aria-label="Set as primary"
															onClick={() => handleMakePrimary(row.email)}
														/>
													}
												>
													<StarIcon className="size-4" weight="regular" />
												</TooltipTrigger>
												<TooltipContent side="top">
													Set as primary
												</TooltipContent>
											</Tooltip>
											<Tooltip>
												<TooltipTrigger
													render={
														<Button
															type="button"
															variant="ghost"
															size="icon-sm"
															className={iconButton}
															disabled={!canUnlinkAny}
															aria-label="Remove account"
															onClick={() => handleUnlink(row)}
														/>
													}
												>
													<TrashIcon className="size-4" weight="regular" />
												</TooltipTrigger>
												<TooltipContent side="top">
													{canUnlinkAny ? "Remove" : "Add another login first"}
												</TooltipContent>
											</Tooltip>
										</div>
									</li>
								);
							})}
						</ul>
					)}
				</CardContent>
			</Card>
		</TooltipProvider>
	);
}
