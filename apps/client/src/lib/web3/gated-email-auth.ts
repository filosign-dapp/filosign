import { preAuthenticate } from "thirdweb/wallets/in-app";
import {
	defaultThirdwebChain,
	filosignInAppWallet,
	thirdwebClient,
} from "@/src/lib/web3/config";

export async function sendThirdwebEmailOtp(email: string): Promise<void> {
	const normalized = email.trim().toLowerCase();
	if (!normalized) {
		throw new Error("Email is required");
	}
	await preAuthenticate({
		client: thirdwebClient,
		strategy: "email",
		email: normalized,
	});
}

export async function connectFilosignInAppWalletWithEmailOtp(args: {
	email: string;
	verificationCode: string;
}) {
	const email = args.email.trim().toLowerCase();
	const verificationCode = args.verificationCode.trim();
	if (!email || !verificationCode) {
		throw new Error("Email and verification code are required");
	}
	await filosignInAppWallet.connect({
		client: thirdwebClient,
		chain: defaultThirdwebChain,
		strategy: "email",
		email,
		verificationCode,
	});
	return filosignInAppWallet;
}
