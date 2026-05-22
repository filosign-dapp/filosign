import { useFilosignContext } from "@filosign/react";
import { useAuthedApi, useIsRegistered } from "@filosign/react/auth";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
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
	| "finish-setup"
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
			toast.error("Invalid or expired invite link");
		}
	}, [inviteQuery.isError, inviteQuery.error]);

	useEffect(() => {
		const claimInvite = async () => {
			if (
				!ready ||
				!authenticated ||
				!isRegistered.data ||
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
				toast.success(
					"Invite accepted! You can now receive documents from this sender.",
				);

				setTimeout(() => {
					void navigate({ to: "/dashboard/connections" });
				}, 2000);
			} catch (error) {
				logger.error("Failed to claim invite:", error);
				toast.error("Failed to accept invite. It may have expired.");
			} finally {
				setIsClaiming(false);
			}
		};

		void claimInvite();
	}, [
		ready,
		authenticated,
		isRegistered.data,
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

	const goToOnboarding = () => {
		void navigate({ to: "/onboarding" });
	};

	const isLoading = inviteQuery.isLoading || !ready;

	const view: InviteView = (() => {
		if (isLoading) return "boot";
		if (claimSuccess) return "success";
		if (isClaiming) return "claiming";
		if (authenticated && isRegistered.isPending) return "checking-account";
		if (authenticated && isRegistered.data === false) return "finish-setup";
		if (authenticated && isRegistered.data === true && !claimSuccess) {
			return "auto-claiming";
		}
		return "signup";
	})();

	return {
		inviteData,
		view,
		handleSignUp,
		goToOnboarding,
	};
}

export type InviteController = ReturnType<typeof useInviteController>;
