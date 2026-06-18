import {
	isOrpcErrorLike,
	presentError,
	readAppCodeFromOrpc,
} from "@filosign/errors";
import { useFilosignContext } from "@filosign/react";
import { useIsRegistered, useLogin } from "@filosign/react/auth";
import { useActiveOrgId, useOrganizations } from "@filosign/react/orgs";
import { useRedeemPartnerInvite } from "@filosign/react/platform-access";
import { useQueryClient } from "@tanstack/react-query";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useAuthToken } from "thirdweb/react";
import { bootstrapNewAccount } from "@/src/lib/auth/bootstrap-new-account";
import { toastUser } from "@/src/lib/copy/toast";
import { TOASTS } from "@/src/lib/copy/toasts";
import { showAppErrorToast } from "@/src/lib/errors";
import { useSetPersistedActiveOrganizationId } from "@/src/lib/filosign/persisted-active-org";
import {
	clearStoredLegalAssent,
	LEGAL_ASSENT_REQUIRED_MESSAGE,
	readStoredLegalAssent,
} from "@/src/lib/web3/legal-assent-session";
import {
	isPermanentPartnerInviteRedeemError,
	shouldClearAccessGateAfterPartnerRedeemError,
	shouldPreservePartnerInviteGate,
} from "@/src/lib/web3/partner-invite-redeem-errors";
import {
	clearStoredAccessGate,
	readStoredAccessGate,
} from "@/src/lib/web3/platform-access-session";
import { useThirdweb } from "@/src/lib/web3/use-thirdweb";

export type AutoRegisterPhase = "register" | "bootstrap" | "redeem";

export type AutoRegisterStatus =
	| { status: "idle" }
	| { status: "registering" }
	| { status: "bootstrapping" }
	| { status: "redeeming" }
	| { status: "completed" }
	| {
			status: "failed";
			phase: AutoRegisterPhase;
			error: string;
			appCode?: string;
	  };

type AutoRegisterContextValue = {
	status: AutoRegisterStatus;
	isBlocking: boolean;
	retry: () => void;
};

const AutoRegisterContext = createContext<AutoRegisterContextValue | null>(
	null,
);

function autoRegisterFailureFromError(
	error: unknown,
	fallback: string,
): { error: string; appCode?: string } {
	const presented = presentError(error);
	const message =
		presented.description ||
		(error instanceof Error ? error.message : fallback);
	const rawCode = isOrpcErrorLike(error) ? readAppCodeFromOrpc(error) : null;
	return {
		error: message,
		...(rawCode ? { appCode: rawCode } : {}),
	};
}

export function useAutoRegisterOptional() {
	return useContext(AutoRegisterContext);
}

export function AutoRegisterProvider({ children }: { children: ReactNode }) {
	const { ready, authenticated } = useThirdweb();
	const { wallet, rpc, rpcQuery, session } = useFilosignContext();
	const thirdwebAuthToken = useAuthToken();
	const isRegistered = useIsRegistered();
	const orgsQuery = useOrganizations();
	const activeOrgId = useActiveOrgId();
	const login = useLogin();
	const redeemPartnerInvite = useRedeemPartnerInvite();
	const queryClient = useQueryClient();
	const setActiveOrgId = useSetPersistedActiveOrganizationId();

	const [status, setStatus] = useState<AutoRegisterStatus>({ status: "idle" });
	const inFlightRef = useRef(false);
	const lastFailedPhaseRef = useRef<AutoRegisterPhase | null>(null);

	const walletAddress = wallet?.account.address;
	const token = thirdwebAuthToken?.trim();

	const orgCount = orgsQuery.data?.organizations?.length ?? 0;
	const orgsReady =
		isRegistered.data === true && !orgsQuery.isPending && orgsQuery.isSuccess;

	const resolveTargetOrganizationId = useCallback((): string | undefined => {
		const persisted = activeOrgId?.trim();
		if (persisted) return persisted;
		const first = orgsQuery.data?.organizations?.[0]?.id?.trim();
		return first || undefined;
	}, [activeOrgId, orgsQuery.data?.organizations]);

	const runBootstrap = useCallback(async () => {
		if (!wallet || !walletAddress || !token) {
			throw new Error("Wallet session required");
		}
		setStatus({ status: "bootstrapping" });
		await bootstrapNewAccount({
			queryClient,
			rpc,
			rpcQuery,
			session,
			wallet,
			thirdwebAuthToken: token,
			setActiveOrgId,
		});
	}, [
		queryClient,
		rpc,
		rpcQuery,
		session,
		setActiveOrgId,
		token,
		wallet,
		walletAddress,
	]);

	const runRegister = useCallback(async () => {
		if (!token) {
			throw new Error("Authentication token required");
		}
		const legalAssent = readStoredLegalAssent();
		if (!legalAssent) {
			throw new Error(LEGAL_ASSENT_REQUIRED_MESSAGE);
		}
		setStatus({ status: "registering" });
		await login.mutateAsync({
			idToken: token,
			accessGate: readStoredAccessGate() ?? undefined,
			legalAssent,
		});
		clearStoredLegalAssent();
		clearStoredAccessGate();
	}, [login, token]);

	const runRedeemFlow = useCallback(async () => {
		if (inFlightRef.current) return;
		inFlightRef.current = true;

		const storedGate = readStoredAccessGate();
		const platformInviteToken = storedGate?.platformInviteToken?.trim();
		if (!platformInviteToken) {
			inFlightRef.current = false;
			setStatus({ status: "completed" });
			return;
		}

		setStatus({ status: "redeeming" });
		try {
			const organizationId =
				orgCount > 0 ? resolveTargetOrganizationId() : undefined;
			const result = await redeemPartnerInvite.mutateAsync({
				platformInviteToken,
				organizationId,
			});

			if (result.organizationId) {
				setActiveOrgId(result.organizationId);
			}

			clearStoredAccessGate();
			lastFailedPhaseRef.current = null;
			setStatus({ status: "completed" });
		} catch (error) {
			if (isPermanentPartnerInviteRedeemError(error)) {
				showAppErrorToast(error);
				if (shouldClearAccessGateAfterPartnerRedeemError(error)) {
					clearStoredAccessGate();
				}
			} else if (!shouldPreservePartnerInviteGate(error)) {
				showAppErrorToast(error);
			} else {
				toastUser.error(TOASTS.auth.partnerTrialFailed.title, {
					hint: TOASTS.auth.partnerTrialFailed.hint,
				});
			}

			const failure = autoRegisterFailureFromError(
				error,
				"Partner invite redeem failed",
			);
			lastFailedPhaseRef.current = "redeem";
			setStatus({ status: "failed", phase: "redeem", ...failure });
		} finally {
			inFlightRef.current = false;
		}
	}, [
		orgCount,
		redeemPartnerInvite,
		resolveTargetOrganizationId,
		setActiveOrgId,
	]);

	const runFlow = useCallback(
		async (skipRegister: boolean) => {
			if (inFlightRef.current) return;
			inFlightRef.current = true;
			let phase: AutoRegisterPhase = skipRegister ? "bootstrap" : "register";
			try {
				if (!skipRegister) {
					await runRegister();
					phase = "bootstrap";
				}
				await runBootstrap();
				lastFailedPhaseRef.current = null;
				setStatus({ status: "completed" });
			} catch (error) {
				const failure = autoRegisterFailureFromError(
					error,
					"Account setup failed",
				);
				lastFailedPhaseRef.current = phase;
				setStatus({ status: "failed", phase, ...failure });
			} finally {
				inFlightRef.current = false;
			}
		},
		[runBootstrap, runRegister],
	);

	const retry = useCallback(() => {
		if (lastFailedPhaseRef.current === "redeem") {
			void runRedeemFlow();
			return;
		}

		const skipRegister =
			isRegistered.data === true || lastFailedPhaseRef.current === "bootstrap";
		void runFlow(skipRegister);
	}, [isRegistered.data, runFlow, runRedeemFlow]);

	useEffect(() => {
		if (!ready || !authenticated || !walletAddress || !token) return;
		if (isRegistered.isPending) return;
		if (inFlightRef.current) return;
		if (status.status === "completed" || status.status === "failed") return;

		if (isRegistered.data === true) {
			if (!orgsReady) return;

			const storedGate = readStoredAccessGate();
			if (storedGate?.platformInviteToken?.trim()) {
				void runRedeemFlow();
				return;
			}

			if (orgCount > 0) {
				setStatus({ status: "completed" });
				return;
			}
			void runFlow(true);
			return;
		}

		if (isRegistered.data === false) {
			if (!readStoredLegalAssent()) {
				setStatus({
					status: "failed",
					phase: "register",
					error: LEGAL_ASSENT_REQUIRED_MESSAGE,
				});
				return;
			}
			void runFlow(false);
		}
	}, [
		authenticated,
		isRegistered.data,
		isRegistered.isPending,
		orgCount,
		orgsReady,
		ready,
		runFlow,
		runRedeemFlow,
		status.status,
		token,
		walletAddress,
	]);

	const isBlocking = useMemo(
		() =>
			status.status === "registering" ||
			status.status === "bootstrapping" ||
			status.status === "redeeming" ||
			(authenticated &&
				isRegistered.data === false &&
				status.status !== "failed"),
		[authenticated, isRegistered.data, status.status],
	);

	const value = useMemo(
		() => ({ status, isBlocking, retry }),
		[status, isBlocking, retry],
	);

	return (
		<AutoRegisterContext.Provider value={value}>
			{children}
		</AutoRegisterContext.Provider>
	);
}
