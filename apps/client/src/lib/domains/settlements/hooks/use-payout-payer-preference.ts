import { useFilosignContext } from "@filosign/react";
import { useEntitlements } from "@filosign/react/billing";
import { walletAccountAddress } from "@filosign/react/utils";
import { useEffect } from "react";
import { useOrgWalletAddress } from "@/src/lib/domains/orgs/use-org-wallet-address";
import {
	defaultPayoutPayerSource,
	resolveTreasuryPayerOffer,
} from "@/src/lib/domains/settlements/utils/payout-payer-default";

type PayoutPayerForm = {
	payoutPayerSource?: "sender" | "org_wallet";
	payoutPayerUserOverride?: boolean;
};

type FormApi = {
	setFieldValue: (
		field: "payoutPayerSource" | "payoutPayerUserOverride",
		value: "sender" | "org_wallet" | boolean,
	) => void;
};

export function usePayoutPayerPreference(
	form: FormApi,
	values: PayoutPayerForm,
) {
	const { wallet } = useFilosignContext();
	const { data: entitlements } = useEntitlements();
	const orgWalletAddress = useOrgWalletAddress();
	const connectedWalletAddress = wallet?.account
		? walletAccountAddress(wallet.account)
		: undefined;

	const offer = resolveTreasuryPayerOffer({
		entitlements,
		orgWalletAddress,
		connectedWalletAddress,
	});

	useEffect(() => {
		const nextSource = defaultPayoutPayerSource({
			canOfferTreasuryPayer: offer.canOfferTreasuryPayer,
			payoutPayerUserOverride: values.payoutPayerUserOverride,
			currentSource: values.payoutPayerSource,
		});

		if (nextSource !== (values.payoutPayerSource ?? "sender")) {
			form.setFieldValue("payoutPayerSource", nextSource);
		}
	}, [
		form,
		offer.canOfferTreasuryPayer,
		values.payoutPayerSource,
		values.payoutPayerUserOverride,
	]);

	return {
		...offer,
		payoutPayerSource: values.payoutPayerSource ?? "sender",
		setPayoutPayerSource: (source: "sender" | "org_wallet") => {
			form.setFieldValue("payoutPayerUserOverride", true);
			form.setFieldValue("payoutPayerSource", source);
		},
		resetTreasuryDefault: () => {
			form.setFieldValue("payoutPayerUserOverride", false);
			form.setFieldValue("payoutPayerSource", "org_wallet");
		},
		useConnectedWallet: () => {
			form.setFieldValue("payoutPayerUserOverride", true);
			form.setFieldValue("payoutPayerSource", "sender");
		},
	};
}
