import {
	type LinkOrgWalletTypedData,
	linkOrgWalletTypedData,
} from "@filosign/react/orgs";
import { disconnect, getConnection, watchConnection } from "@wagmi/core";
import { type Address, createWalletClient, custom, type Hex } from "viem";
import { getTreasuryAppKit } from "@/src/lib/web3/treasury/appkit";
import { treasuryChain } from "@/src/lib/web3/treasury/chain";

export type TreasuryWalletSession = {
	address: Address;
	signLinkOrgWallet: (args: {
		organizationId: string;
		timestamp: number;
		verifyingContract: Address;
	}) => Promise<Hex>;
	disconnect: () => Promise<void>;
};

type Eip1193Provider = {
	request: (args: {
		method: string;
		params?: unknown[] | object;
	}) => Promise<unknown>;
};

function isTreasuryConnectorReady(
	connection: ReturnType<typeof getConnection>,
): connection is Extract<
	ReturnType<typeof getConnection>,
	{ status: "connected"; address: Address }
> {
	return (
		connection.status === "connected" &&
		Boolean(connection.address) &&
		typeof connection.connector?.getChainId === "function"
	);
}

async function waitUntilTreasuryConnectorReady(
	wagmiConfig: ReturnType<typeof getTreasuryAppKit>["wagmiConfig"],
	timeoutMs = 10_000,
): Promise<Address> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const connection = getConnection(wagmiConfig);
		if (isTreasuryConnectorReady(connection)) {
			return connection.address;
		}
		await new Promise((resolve) => setTimeout(resolve, 50));
	}
	throw new Error("Wallet connection did not become ready. Please try again.");
}

function waitForTreasuryConnection(): Promise<Address> {
	const { modal, wagmiConfig } = getTreasuryAppKit();

	return new Promise((resolve, reject) => {
		let settled = false;

		const cleanup = () => {
			unsubConnection();
			unsubState();
		};

		const finishWithAddress = async (address: Address) => {
			if (settled) return;
			try {
				const readyAddress = await waitUntilTreasuryConnectorReady(wagmiConfig);
				settled = true;
				cleanup();
				modal.close();
				resolve(readyAddress ?? address);
			} catch (err) {
				settled = true;
				cleanup();
				reject(err);
			}
		};

		const unsubConnection = watchConnection(wagmiConfig, {
			onChange(connection) {
				if (settled || !connection.isConnected || !connection.address) return;
				void finishWithAddress(connection.address);
			},
		});

		const unsubState = modal.subscribeState((state) => {
			if (settled || state.open) return;
			const connection = getConnection(wagmiConfig);
			if (!connection.isConnected) {
				settled = true;
				cleanup();
				reject(new Error("Wallet connection cancelled."));
			}
		});

		void modal.ready().then(() => {
			void modal.open({ view: "Connect", namespace: "eip155" });
		});
	});
}

async function signLinkOrgWalletWithProvider(
	address: Address,
	args: {
		organizationId: string;
		timestamp: number;
		verifyingContract: Address;
	},
): Promise<Hex> {
	const { modal } = getTreasuryAppKit();
	const provider = modal.getProvider<Eip1193Provider>("eip155");
	if (!provider) {
		throw new Error("Treasury wallet provider is not available.");
	}

	const typedData: LinkOrgWalletTypedData = linkOrgWalletTypedData({
		organizationId: args.organizationId,
		wallet: address,
		timestamp: args.timestamp,
		chainId: treasuryChain().id,
		verifyingContract: args.verifyingContract,
	});

	const wallet = createWalletClient({
		account: address,
		chain: treasuryChain(),
		transport: custom(provider),
	});

	return wallet.signTypedData({
		account: address,
		domain: typedData.domain,
		types: typedData.types,
		primaryType: "LinkOrgWallet",
		message: typedData.message,
	});
}

export async function connectTreasuryWalletSession(): Promise<TreasuryWalletSession> {
	const { modal, wagmiConfig } = getTreasuryAppKit();
	await modal.ready();

	const prior = getConnection(wagmiConfig);
	if (prior.isConnected) {
		await modal.disconnect("eip155").catch(async () => {
			await disconnect(wagmiConfig);
		});
	}

	const address = await waitForTreasuryConnection();

	return {
		address,
		signLinkOrgWallet: (args) => signLinkOrgWalletWithProvider(address, args),
		disconnect: async () => {
			await modal.disconnect("eip155").catch(async () => {
				await disconnect(wagmiConfig);
			});
		},
	};
}
