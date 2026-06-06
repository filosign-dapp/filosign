import { useFilosignContext } from "@filosign/react";
import { useAuthedApi, useIsRegistered } from "@filosign/react/auth";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useAutoRegisterOptional } from "@/src/lib/auth/auto-register-provider";
import { logger } from "@/src/lib/utils/logger";
import { useThirdweb } from "@/src/lib/web3/use-thirdweb";

export type InviteData = {
	inviteeEmail: string;
	senderName?: string;
	message?: string;
};

export type InviteView =
	| "boot"
	| "success"
	| "claiming"
	| "checking-account"
	| "setting-up"
	| "setup-failed"
	| "auto-claiming"
	| "signup";

const inviteByIdSchema = z.object({
	inviteeEmail: z.string(),
	senderName: z.string(),
	message: z.string().nullable(),
});

export function useInviteController() {
	const { inviteId } = useParams({ from: "/invite/$inviteId/" });
	const { ready, authenticated, login } = useThirdweb();
	const { rpcQuery, ready: filosignReady } = useFilosignContext();
	const { data: auth } = useAuthedApi();
	const navigate = useNavigate();
	const isRegistered = useIsRegistered();
	const autoRegister = useAutoRegisterOptional();

	const [isClaiming, setIsClaiming] = useState(false);
	const [claimSuccess, setClaimSuccess] = useState(false);

	const inviteQuery = useQuery({
		...rpcQuery.sharing.inviteById.queryOptions({
			input: { id: inviteId ?? "" },
		}),
		enabled: filosignReady && !!inviteId,
	});

	const inviteData: InviteData | null = (() => {
		if (!inviteQuery.data) return null;
		try {
			const data = inviteByIdSchema.parse(inviteQuery.data);
			return {
				inviteeEmail: data.inviteeEmail,
				senderName: data.senderName,
				message: data.message ?? undefined,
			};
		} catch {
			return null;
		}
	})();

	useEffect(() => {
		if (inviteQuery.isError) {
			logger.error("Failed to fetch invite:", inviteQuery.error);
		}
	}, [inviteQuery.isError, inviteQuery.error]);

	const autoRegisterStatus = autoRegister?.status.status ?? "idle";
	const autoRegisterReady = autoRegisterStatus === "completed";
	const autoRegisterFailed = autoRegisterStatus === "failed";
	const autoRegisterBlocking = autoRegister?.isBlocking ?? false;

	useEffect(() => {
		const claimInvite = async () => {
			if (
				!ready ||
				!authenticated ||
				!isRegistered.data ||
				!autoRegisterReady ||
				!auth ||
				!inviteId ||
				claimSuccess
			) {
				return;
			}

			setIsClaiming(true);

			try {
				await auth.rpc.sharing.inviteClaim({ id: inviteId });
				setClaimSuccess(true);

				setTimeout(() => {
					void navigate({ to: "/dashboard/connections" });
				}, 2000);
			} catch (error) {
				logger.error("Failed to claim invite:", error);
			} finally {
				setIsClaiming(false);
			}
		};

		void claimInvite();
	}, [
		ready,
		authenticated,
		isRegistered.data,
		autoRegisterReady,
		auth,
		inviteId,
		navigate,
		claimSuccess,
	]);

	const handleSignUp = async () => {
		if (inviteId) {
			sessionStorage.setItem("pendingInviteId", inviteId);
		}
		await login();
	};

	const isLoading = inviteQuery.isLoading || !ready;

	const view: InviteView = (() => {
		if (isLoading) return "boot";
		if (claimSuccess) return "success";
		if (isClaiming) return "claiming";
		if (authenticated && (isRegistered.isPending || autoRegisterBlocking)) {
			return "setting-up";
		}
		if (authenticated && autoRegisterFailed) return "setup-failed";
		if (authenticated && isRegistered.isPending) return "checking-account";
		if (authenticated && isRegistered.data === false) return "setting-up";
		if (
			authenticated &&
			isRegistered.data === true &&
			!autoRegisterReady &&
			!autoRegisterFailed
		) {
			return "setting-up";
		}
		if (authenticated && isRegistered.data === true && !claimSuccess) {
			return "auto-claiming";
		}
		return "signup";
	})();

	return {
		inviteData,
		view,
		handleSignUp,
		retryAutoRegister: autoRegister?.retry,
		autoRegisterError:
			autoRegister?.status.status === "failed"
				? autoRegister.status.error
				: null,
	};
}

export type InviteController = ReturnType<typeof useInviteController>;
