import { Button } from "@/src/lib/components/ui/button";
import { truncateAddress } from "@/src/lib/utils/utils";

type Props = {
	canOfferTreasuryPayer: boolean;
	payoutPayerSource: "sender" | "org_wallet";
	orgWalletAddress?: `0x${string}`;
	onUseConnectedWallet: () => void;
	onUseTreasury: () => void;
};

export function PayoutPayerControl({
	canOfferTreasuryPayer,
	payoutPayerSource,
	orgWalletAddress,
	onUseConnectedWallet,
	onUseTreasury,
}: Props) {
	if (!canOfferTreasuryPayer || !orgWalletAddress) return null;

	if (payoutPayerSource === "org_wallet") {
		return (
			<p className="text-xs text-muted-foreground">
				Payouts fund from workspace treasury (
				{truncateAddress(orgWalletAddress)}
				).{" "}
				<Button
					type="button"
					variant="link"
					className="h-auto p-0 text-xs font-medium"
					onClick={onUseConnectedWallet}
				>
					Use my account instead
				</Button>
			</p>
		);
	}

	return (
		<p className="text-xs text-muted-foreground">
			Paying from your account.{" "}
			<Button
				type="button"
				variant="link"
				className="h-auto p-0 text-xs font-medium"
				onClick={onUseTreasury}
			>
				Use workspace treasury
			</Button>
		</p>
	);
}
