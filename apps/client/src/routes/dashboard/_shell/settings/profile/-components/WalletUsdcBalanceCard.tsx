import { useMemo, useState } from "react";
import { toast } from "sonner";
import { getContract } from "thirdweb";
import { useActiveAccount, useReadContract } from "thirdweb/react";
import { formatUnits } from "viem";
import { defaultChain, SUPPORTED_TOKENS } from "@/src/constants";
import env from "@/src/env";
import { Image } from "@/src/lib/components/app/media/image";
import { Button } from "@/src/lib/components/ui/button";
import { defaultThirdwebChain, thirdwebClient } from "@/src/lib/web3/config";
import { useThirdweb } from "@/src/lib/web3/use-thirdweb";

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

export function WalletUsdcBalanceCard() {
	const account = useActiveAccount();
	const { openTopUp } = useThirdweb();
	const [topUpLoading, setTopUpLoading] = useState(false);

	const address = account?.address;
	const checksummed = address as `0x${string}` | undefined;

	const usdcContract = useMemo(
		() =>
			getContract({
				client: thirdwebClient,
				address: usdc.address,
				chain: defaultThirdwebChain,
			}),
		[],
	);

	const balanceParams = checksummed
		? ([checksummed] as const)
		: (["0x0000000000000000000000000000000000000000"] as const);

	const { data, isPending, isError, refetch } = useReadContract({
		contract: usdcContract,
		method: "function balanceOf(address account) view returns (uint256)",
		params: balanceParams,
		queryOptions: { enabled: Boolean(checksummed) },
	});

	const onrampEnabled = env.VITE_CHAIN === "mainnet";
	const faucetUrl = usdc.faucets[0]?.url;

	const parts = useMemo(() => {
		const value = typeof data === "bigint" ? data : 0n;
		return formatUsdcAmountParts(value, usdc.decimals);
	}, [data]);

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

	return (
		<section
			className="w-full rounded-2xl border border-border/45 bg-linear-to-b from-card to-muted/15 px-5 pb-4 pt-4 shadow-sm"
			aria-label="Wallet balance"
		>
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

			<div className="mt-4 flex flex-col items-start gap-1.5 border-t border-border/35 pt-3">
				{defaultChain.name === "Base Sepolia" && (
					<Button
						type="button"
						size="sm"
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
				)}
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
