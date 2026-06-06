import {
	DotsThreeVerticalIcon,
	KeyIcon,
	UserMinusIcon,
	UsersIcon,
} from "@phosphor-icons/react";
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
import { useWorkspaceSettings } from "@/src/routes/dashboard/_shell/settings/workspace/-lib/context/context";
import type { MemberRow } from "./member-row";

const ROLE_OPTIONS = ["owner", "admin", "sender", "viewer"] as const;

type Props = {
	member: MemberRow;
	showDeliver: boolean;
	isSelf: boolean;
};

export function MemberRowActions({ member: m, showDeliver, isSelf }: Props) {
	const { setRole, orgDetail, wrapKey, removeMember } = useWorkspaceSettings();

	return (
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
				{!isSelf ? (
					<>
						<DropdownMenuSub>
							<DropdownMenuSubTrigger className="gap-2 cursor-pointer">
								<UsersIcon className="size-4" aria-hidden="true" />
								<span>Change role</span>
							</DropdownMenuSubTrigger>
							<DropdownMenuPortal>
								<DropdownMenuSubContent className="w-32">
									{ROLE_OPTIONS.map((r) => (
										<DropdownMenuItem
											key={r}
											disabled={m.role === r}
											onClick={() => {
												setRole.mutate(
													{
														walletAddress: m.walletAddress,
														role: r,
													},
													{
														onSuccess: () => void orgDetail.refetch(),
														onError: (e) => console.error(e),
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
						<DropdownMenuSeparator />
					</>
				) : null}
				{showDeliver ? (
					<DropdownMenuItem
						disabled={wrapKey.isPending}
						onClick={() => {
							wrapKey.mutate(
								{ targetWallet: m.walletAddress },
								{
									onSuccess: () => void orgDetail.refetch(),
									onError: (e) => console.error(e),
								},
							);
						}}
						className="gap-2 cursor-pointer"
					>
						<KeyIcon className="size-4" aria-hidden="true" />
						<span>Grant access</span>
					</DropdownMenuItem>
				) : null}
				{showDeliver && !isSelf ? <DropdownMenuSeparator /> : null}
				{!isSelf ? (
					<DropdownMenuItem
						disabled={removeMember.isPending}
						onClick={() => {
							removeMember.mutate(
								{ walletAddress: m.walletAddress },
								{
									onSuccess: () => void orgDetail.refetch(),
									onError: (e) => console.error(e),
								},
							);
						}}
						className="gap-2 text-destructive focus:text-destructive cursor-pointer"
					>
						<UserMinusIcon className="size-4" aria-hidden="true" />
						<span>Remove</span>
					</DropdownMenuItem>
				) : null}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
