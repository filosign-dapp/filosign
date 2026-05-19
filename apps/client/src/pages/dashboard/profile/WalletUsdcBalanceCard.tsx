import { CaretDownIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useActiveAccount } from "thirdweb/react";
import { formatUnits } from "viem";
import { useBalance } from "wagmi";
import {
	defaultChain,
	SUPPORTED_TOKENS,
	usesLocalMockUsdc,
} from "@/src/constants";
import env from "@/src/env";
import { Image } from "@/src/lib/components/custom/Image";
import { Button } from "@/src/lib/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/src/lib/components/ui/dropdown-menu";
import { useWalletTopUp } from "@/src/lib/hooks/use-wallet-top-up";
import { copyToClipboard } from "@/src/lib/utils/utils";

const usdc = SUPPORTED_TOKENS[0];

function formatUsdcAmountParts(
	value: bigint,
	decimals: number,
): { whole: string; fraction: string } {
	const n = Number(formatUnits(value, decimals));
	const safe = Number.isFinite(n) ? n : 0;
	const parts = new Intl.NumberFormat(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).formatToParts(safe);

	let whole = "";
	let fraction = "";
	for (const p of parts) {
		if (p.type === "integer" || p.type === "group") whole += p.value;
		else if (p.type === "fraction") fraction = p.value;
	}
	return { whole: whole || "0", fraction: fraction || "00" };
}

function explorerAddressUrl(address: string): string | null {
	const base = defaultChain.blockExplorers?.default?.url;
	if (!base) return null;
	const root = base.replace(/\/$/, "");
	return `${root}/address/${address}`;
}

export function WalletUsdcBalanceCard() {
	const account = useActiveAccount();
	const { openTopUp } = useWalletTopUp();
	const [topUpLoading, setTopUpLoading] = useState(false);

	const address = account?.address;
	const checksummed = address as `0x${string}` | undefined;

	const { data, isPending, isError, refetch } = useBalance({
		address: checksummed,
		token: usdc.address as `0x${string}`,
		chainId: defaultChain.id,
		query: { enabled: Boolean(checksummed) },
	});

	const onrampEnabled = env.VITE_CHAIN === "mainnet";
	const faucetUrl = usdc.faucets[0]?.url;

	const explorerUrl = address ? explorerAddressUrl(address) : null;

	const parts = useMemo(() => {
		const decimals = data?.decimals ?? usdc.decimals;
		const value = data?.value ?? 0n;
		return formatUsdcAmountParts(value, decimals);
	}, [data?.decimals, data?.value]);

	const walletTitleSuffix = address ? "My wallet" : "Not connected";

	const handleTopUp = async () => {
		if (!address) return;
		setTopUpLoading(true);
		try {
			await openTopUp();
			await refetch();
		} catch {
			toast.error(
				"Couldn’t open top up. Try again or use a faucet on test networks.",
			);
		} finally {
			setTopUpLoading(false);
		}
	};

	const headerRow = (
		<div className="flex min-w-0 flex-1 items-baseline gap-1.5">
			<span className="shrink-0 text-sm font-medium tracking-tight text-muted-foreground">
				Wallet
			</span>
			<span className="text-muted-foreground/70" aria-hidden>
				—
			</span>
			<span
				className="min-w-0 truncate text-sm font-medium text-foreground/85"
				translate="no"
			>
				{walletTitleSuffix}
			</span>
		</div>
	);

	return (
		<section
			className="w-full rounded-2xl border border-border/45 bg-linear-to-b from-card to-muted/15 px-5 pb-4 pt-4 shadow-sm"
			aria-label="Wallet balance"
		>
			{address ? (
				<DropdownMenu>
					<DropdownMenuTrigger
						type="button"
						className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg py-0.5 text-left outline-none transition-colors hover:bg-muted/25 focus-visible:bg-muted/25 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
						aria-label="Wallet options"
					>
						{headerRow}
						<CaretDownIcon
							className="size-3.5 shrink-0 translate-y-px text-muted-foreground"
							weight="fill"
							aria-hidden
						/>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="min-w-48">
						<DropdownMenuItem
							className="cursor-pointer"
							onClick={() => {
								copyToClipboard(address);
							}}
						>
							Copy address
						</DropdownMenuItem>
						{explorerUrl ? (
							<DropdownMenuItem
								className="cursor-pointer"
								onClick={() => {
									window.open(explorerUrl, "_blank", "noopener,noreferrer");
								}}
							>
								View on explorer
							</DropdownMenuItem>
						) : null}
					</DropdownMenuContent>
				</DropdownMenu>
			) : (
				<div className="flex items-center justify-between gap-3 py-0.5">
					{headerRow}
				</div>
			)}

			<div
				className="mt-2 flex min-h-12 flex-wrap items-end gap-x-1.5 gap-y-0.5 tabular-nums"
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
								width={22}
								height={22}
								className="size-[22px] rounded-full opacity-45 grayscale"
							/>
						</span>
						<span className="font-inter text-4xl font-black leading-none tracking-tight text-foreground sm:text-5xl">
							{parts.whole}
						</span>
						<span className="font-inter mb-0.5 text-xl font-bold leading-none text-foreground sm:text-2xl">
							.{parts.fraction}
						</span>
						<span className="mb-1.5 ml-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
							USDC
						</span>
					</>
				)}
			</div>

			<div className="mt-4 flex flex-col gap-1.5 border-t border-border/35 pt-3">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<p className="text-[11px] text-muted-foreground">
						{defaultChain.name}
					</p>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="h-8 shrink-0 px-2 text-sm font-medium text-foreground/90 hover:bg-muted/40 hover:text-foreground"
						disabled={
							!address || topUpLoading || (!onrampEnabled && !faucetUrl)
						}
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
				</div>
				{usesLocalMockUsdc ? (
					<p className="text-[11px] leading-snug text-muted-foreground">
						Local Hardhat: balance is MockUSDC from your last local deploy (not
						Base Sepolia USDC).
					</p>
				) : null}
				{!onrampEnabled ? (
					<p className="text-[11px] leading-snug text-muted-foreground">
						Card purchases work on mainnet only.
						{faucetUrl ? (
							<> Use the Circle faucet for {defaultChain.name}.</>
						) : null}
					</p>
				) : null}
			</div>
		</section>
	);
}
