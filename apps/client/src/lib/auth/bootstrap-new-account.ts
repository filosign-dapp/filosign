import {
	encryption,
	KEM,
	randomBytes,
	toBytes,
	toHex,
} from "@filosign/crypto-utils";
import type { FilosignRpcQueryUtils, FilosignWallet } from "@filosign/react";
import { fetchKeyRegistrySnapshot } from "@filosign/react/auth";
import type { AppRouterClient, FilosignSession } from "@filosign/react/orpc";
import { ORG_OMK_WRAP_INFO } from "@filosign/shared";
import type { QueryClient } from "@tanstack/react-query";
import type { Hex } from "viem";
import {
	DEFAULT_ACCOUNT_FIRST_NAME,
	defaultWorkspaceName,
} from "@/src/lib/auth/account-defaults";
import { logger } from "@/src/lib/utils/logger";

export type BootstrapNewAccountArgs = {
	queryClient: QueryClient;
	rpc: AppRouterClient;
	rpcQuery: FilosignRpcQueryUtils;
	session: FilosignSession;
	wallet: FilosignWallet;
	thirdwebAuthToken: string;
	setActiveOrgId: (id: string) => void;
};

function bindAuthedSession(args: {
	session: FilosignSession;
	walletAddress: string;
	thirdwebAuthToken: string;
}) {
	args.session.bindWallet(args.walletAddress);
	args.session.setThirdwebAuthToken(args.thirdwebAuthToken.trim());
}

async function createOrganizationCall(args: {
	rpcQuery: FilosignRpcQueryUtils;
	userEncryptionPublicKey: Hex;
	name: string;
}) {
	const omkSeed = randomBytes(64);
	const { publicKey: omkPublic } = await KEM.keyGen({ seed: omkSeed });
	const omkPublicHex = toHex(omkPublic);

	const { ciphertext, sharedSecret } = await KEM.encapsulate({
		publicKeyOther: toBytes(args.userEncryptionPublicKey),
	});
	const wrappedOmkForCreator = await encryption.encrypt({
		message: omkSeed,
		secretKey: sharedSecret,
		info: ORG_OMK_WRAP_INFO,
	});

	return args.rpcQuery.orgs.create.call({
		name: args.name,
		encryptionPublicKey: omkPublicHex,
		wrappedOmkForCreator: toHex(wrappedOmkForCreator),
		creatorWrapKemCiphertext: toHex(ciphertext),
	});
}

async function claimPendingConnectionInvite(rpc: AppRouterClient) {
	const pendingInviteId = sessionStorage.getItem("pendingInviteId");
	if (!pendingInviteId) return;
	try {
		await rpc.sharing.inviteClaim({ id: pendingInviteId });
		sessionStorage.removeItem("pendingInviteId");
	} catch (error) {
		logger.error("Failed to claim invite:", error);
	}
}

export async function bootstrapNewAccount(
	args: BootstrapNewAccountArgs,
): Promise<void> {
	const walletAddress = args.wallet.account.address;
	bindAuthedSession({
		session: args.session,
		walletAddress,
		thirdwebAuthToken: args.thirdwebAuthToken,
	});

	const snapshot = await fetchKeyRegistrySnapshot(args.rpc, walletAddress);
	if (!snapshot.isRegistered) {
		throw new Error("Filosign registration required before bootstrap");
	}

	let profile = await args.rpcQuery.users.profile.me.call();
	const firstName = profile.firstName?.trim();
	if (!firstName || firstName.length === 0) {
		await args.rpcQuery.users.profile.update.call({
			firstName: DEFAULT_ACCOUNT_FIRST_NAME,
		});
		profile = await args.rpcQuery.users.profile.me.call();
	}

	const encryptionPublicKey = profile.encryptionPublicKey as Hex;
	if (!encryptionPublicKey) {
		throw new Error("Profile encryption public key required");
	}

	const orgList = await args.rpcQuery.orgs.listMine.call();
	const existingOrg = orgList.organizations?.[0];

	if (existingOrg?.id) {
		args.setActiveOrgId(existingOrg.id);
	} else {
		const created = await createOrganizationCall({
			rpcQuery: args.rpcQuery,
			userEncryptionPublicKey: encryptionPublicKey,
			name: defaultWorkspaceName(),
		});
		const orgId = created?.organization?.id;
		if (!orgId) {
			throw new Error("No organization ID returned from server.");
		}
		args.setActiveOrgId(orgId);
	}

	await claimPendingConnectionInvite(args.rpc);

	await Promise.all([
		args.queryClient.invalidateQueries({
			queryKey: args.rpcQuery.users.profile.me.key(),
		}),
		args.queryClient.invalidateQueries({
			queryKey: args.rpcQuery.orgs.listMine.key(),
		}),
		args.queryClient.invalidateQueries({
			queryKey: args.rpcQuery.users.activation.get.key(),
		}),
	]);
}
