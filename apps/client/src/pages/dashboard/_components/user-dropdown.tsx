import { useLogout } from "@filosign/react/auth";
import { useUserProfile } from "@filosign/react/users";
import { CopySimpleIcon, SignOutIcon, UserIcon } from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import * as React from "react";
import { Image } from "@/src/lib/components/custom/Image";
import { Button } from "@/src/lib/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/src/lib/components/ui/dropdown-menu";
import { useThirdwebUserInfo } from "@/src/lib/hooks/use-thirdweb-user-info";
import { useThirdwebWalletAuth } from "@/src/lib/hooks/use-thirdweb-wallet-auth";
import { copyToClipboard } from "@/src/lib/utils/utils";

export function UserDropdown() {
	const [isOpen, setIsOpen] = React.useState(false);
	const { user } = useThirdwebUserInfo();
	const { logout: logoutWallet } = useThirdwebWalletAuth();
	const logoutFilosign = useLogout();
	const navigate = useNavigate();

	const { data: userProfile } = useUserProfile();

	const handleSignOut = async () => {
		await logoutFilosign.mutateAsync();
		await logoutWallet();
		navigate({ to: "/" });
	};

	const formatAddress = (address: string) => {
		return `${address.slice(0, 6)}...${address.slice(-4)}`;
	};

	// Use userProfile data for display name, fallback to wallet login data
	const displayName = userProfile
		? userProfile.username ||
			(userProfile.firstName && userProfile.lastName
				? `${userProfile.firstName} ${userProfile.lastName}`
				: userProfile.firstName || userProfile.lastName) ||
			userProfile.email ||
			"User"
		: user?.email?.address || user?.google?.email || "User";

	const walletAddress = user?.wallet?.address;
	const avatarUrl = userProfile?.avatarUrl;
	const contactEmail =
		userProfile?.email?.trim() || user?.email?.address || null;

	return (
		<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
			<DropdownMenuTrigger
				render={
					<Button
						variant="ghost"
						className="relative h-10 w-10 rounded-full transition-all duration-150 hover:bg-accent/50"
					/>
				}
			>
				<div className="flex aspect-square size-8 items-center justify-center bg-muted/10 rounded-full">
					<UserIcon className="size-5 text-muted-foreground" weight="bold" />
				</div>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				className="w-64 rounded-lg mt-1"
				align="end"
				side="bottom"
			>
				{/* Profile Section */}
				<DropdownMenuGroup>
					<DropdownMenuLabel className="text-muted-foreground text-xs">
						Profile
					</DropdownMenuLabel>
					<motion.div
						initial={{ opacity: 0, y: -5 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							type: "spring",
							stiffness: 500,
							damping: 20,
							delay: 0.05,
						}}
					>
						<DropdownMenuItem className="gap-3 p-3 cursor-default">
							<Image
								src={avatarUrl}
								alt="Profile"
								className="aspect-square size-10 rounded-full object-cover"
							>
								<div className="flex aspect-square size-10 items-center justify-center bg-muted/10 rounded-full">
									<UserIcon className="size-6 text-muted-foreground" />
								</div>
							</Image>
							<div className="flex flex-col min-w-0 gap-0.5">
								<p className="font-medium text-sm truncate">{displayName}</p>
								{contactEmail ? (
									<p
										className="text-xs text-muted-foreground truncate"
										title={contactEmail}
									>
										{contactEmail}
									</p>
								) : null}
								<div className="flex items-center gap-1">
									<p className="text-xs text-muted-foreground">
										{walletAddress ? formatAddress(walletAddress) : "No wallet"}
									</p>
									{walletAddress && (
										<Button
											variant="ghost"
											size="sm"
											className="h-4 w-4 p-0 hover:bg-accent/50"
											onClick={() => copyToClipboard(walletAddress)}
										>
											<CopySimpleIcon className="h-3 w-3" />
										</Button>
									)}
								</div>
							</div>
						</DropdownMenuItem>
					</motion.div>
				</DropdownMenuGroup>

				<DropdownMenuSeparator />

				{/* Actions Section */}
				<DropdownMenuGroup>
					<DropdownMenuLabel className="text-muted-foreground text-xs">
						Actions
					</DropdownMenuLabel>
					{[
						{
							icon: UserIcon,
							label: "Manage Profile",
							action: () => {
								navigate({ to: "/dashboard/settings/profile" });
							},
						},
					].map((item, index) => (
						<motion.div
							key={item.label}
							initial={{ opacity: 0, y: -5 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{
								type: "spring",
								stiffness: 500,
								damping: 20,
								delay: 0.1 + index * 0.03,
							}}
						>
							<DropdownMenuItem
								onClick={item.action}
								className="gap-2 p-2 cursor-pointer"
							>
								<div className="flex size-6 items-center justify-center rounded-md">
									<item.icon className="size-5 shrink-0" />
								</div>
								{item.label}
							</DropdownMenuItem>
						</motion.div>
					))}
				</DropdownMenuGroup>

				<DropdownMenuSeparator />

				{/* Sign Out */}
				<motion.div
					initial={{ opacity: 0, y: -5 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						type: "spring",
						stiffness: 500,
						damping: 20,
						delay: 0.2,
					}}
				>
					<DropdownMenuItem
						onClick={handleSignOut}
						className="gap-2 p-2 cursor-pointer text-destructive focus:text-destructive"
					>
						<div className="flex size-6 items-center justify-center rounded-md">
							<SignOutIcon className="size-5 shrink-0 text-destructive" />
						</div>
						<div className="font-medium">Sign out</div>
					</DropdownMenuItem>
				</motion.div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
