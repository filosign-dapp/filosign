import { WalletIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { useActiveAccount, useWalletDetailsModal } from "thirdweb/react";
import { defaultChain, SUPPORTED_TOKENS } from "@/src/constants";
import env from "@/src/env";
import { CopyButton } from "@/src/lib/components/app/chrome/copy-button";
import { Image } from "@/src/lib/components/app/media/image";
import { Button } from "@/src/lib/components/ui/button";
import { useTheme } from "@/src/lib/components/ui/theme-provider";
import { thirdwebWalletModalOptions } from "@/src/lib/web3/config";
import { formatUsdcAmountParts } from "@/src/lib/web3/format-usdc";
import { useThirdweb } from "@/src/lib/web3/use-thirdweb";
import { useWalletUsdcBalance } from "@/src/lib/web3/use-wallet-usdc-balance";
import { ProfileSection } from "./profile-section";

const usdc = SUPPORTED_TOKENS[0];

export function WalletUsdcBalanceCard() {
	const account = useActiveAccount();
	const { openTopUp } = useThirdweb();
	const { resolvedTheme } = useTheme();
	const walletDetailsModal = useWalletDetailsModal();
	const [topUpLoading, setTopUpLoading] = useState(false);

	const address = account?.address;
	const { balance, isPending, isError, refetch } = useWalletUsdcBalance();

	const onrampEnabled = env.VITE_CHAIN === "mainnet";
	const faucetUrl = usdc.faucets[0]?.url;

	const parts = useMemo(
		() => formatUsdcAmountParts(balance, usdc.decimals),
		[balance],
	);

	const handleTopUp = async () => {
		if (!address) return;
		setTopUpLoading(true);
		try {
			await openTopUp();
			await refetch();
		} catch {
			// Top-up modal failed; balance refetch still runs on success path only.
		} finally {
			setTopUpLoading(false);
		}
	};

	const handleManageWallet = () => {
		walletDetailsModal.open({
			...thirdwebWalletModalOptions,
			theme: resolvedTheme,
		});
	};

	return (
		<ProfileSection
			icon={<WalletIcon className="size-4" aria-hidden="true" />}
			title="Wallet Balance"
			description="Manage funds for on-chain contract settlements and payments."
		>
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div
					className="flex min-h-12 items-end gap-x-1.5 gap-y-0.5 tabular-nums"
					aria-live="polite"
				>
					{!address ? (
						<p className="text-sm text-muted-foreground">
							Connect a wallet to see your USDC balance.
						</p>
					) : isPending ? (
						<p className="text-sm text-muted-foreground">Loading…</p>
					) : isError ? (
						<p className="text-sm text-muted-foreground">
							Balance unavailable. Try again later.
						</p>
					) : (
						<>
							<span className="mb-1.5 inline-flex shrink-0">
								<Image
									src={usdc.icon}
									alt=""
									width={36}
									height={36}
									className="rounded-full"
								/>
							</span>
							<span className="font-manrope font-semibold text-4xl leading-none tracking-tight text-foreground sm:text-5xl">
								{parts.whole}.{parts.fraction}
							</span>
						</>
					)}
				</div>

				{address && defaultChain.name === "Base Sepolia" && (
					<div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
						<Button
							type="button"
							size="sm"
							disabled={topUpLoading || (!onrampEnabled && !faucetUrl)}
							onClick={() => {
								if (onrampEnabled) {
									void handleTopUp();
									return;
								}
								if (faucetUrl) {
									window.open(faucetUrl, "_blank", "noopener,noreferrer");
								}
							}}
						>
							{topUpLoading
								? "Starting…"
								: onrampEnabled
									? "Top up"
									: "Get testnet USDC"}
						</Button>
						{!onrampEnabled ? (
							<p className="text-[11px] leading-snug text-muted-foreground text-left sm:text-right">
								Card purchases work on mainnet only.
								{faucetUrl ? (
									<> Use the Circle faucet for {defaultChain.name}.</>
								) : null}
							</p>
						) : null}
					</div>
				)}
			</div>

			{address && (
				<div className="mt-5 space-y-4 border-t border-border/60 pt-4">
					<div className="space-y-1.5">
						<span className="text-xs font-normal text-muted-foreground block">
							Wallet Address
						</span>
						<div className="flex flex-col sm:flex-row sm:items-center gap-2">
							<div className="flex-1 flex items-center gap-2 rounded-md border border-border/40 bg-muted/10 px-3 h-9 font-mono text-xs text-foreground/80 overflow-hidden">
								<span className="truncate flex-1">{address}</span>
								<CopyButton
									text={address}
									className="text-muted-foreground hover:text-foreground shrink-0"
								/>
							</div>
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="h-9 gap-1.5 px-3 text-xs font-normal text-muted-foreground hover:bg-muted/60 hover:text-foreground shrink-0 touch-manipulation"
								onClick={handleManageWallet}
							>
								Manage Wallet
							</Button>
						</div>
					</div>
				</div>
			)}
		</ProfileSection>
	);
}
