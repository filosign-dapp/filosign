import { useFilosignContext } from "@filosign/react";
import { useIsRegistered, useLogin } from "@filosign/react/auth";
import { useOrganizations } from "@filosign/react/orgs";
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
import { useSetPersistedActiveOrganizationId } from "@/src/lib/filosign/persisted-active-org";
import {
	clearStoredAccessGate,
	readStoredAccessGate,
} from "@/src/lib/web3/platform-access-session";
import { useThirdweb } from "@/src/lib/web3/use-thirdweb";

export type AutoRegisterStatus =
	| { status: "idle" }
	| { status: "registering" }
	| { status: "bootstrapping" }
	| { status: "completed" }
	| { status: "failed"; phase: "register" | "bootstrap"; error: string };

type AutoRegisterContextValue = {
	status: AutoRegisterStatus;
	isBlocking: boolean;
	retry: () => void;
};

const AutoRegisterContext = createContext<AutoRegisterContextValue | null>(
	null,
);

export function useAutoRegisterOptional() {
	return useContext(AutoRegisterContext);
}

export function AutoRegisterProvider({ children }: { children: ReactNode }) {
	const { ready, authenticated } = useThirdweb();
	const { wallet, rpc, rpcQuery, session } = useFilosignContext();
	const thirdwebAuthToken = useAuthToken();
	const isRegistered = useIsRegistered();
	const orgsQuery = useOrganizations();
	const login = useLogin();
	const queryClient = useQueryClient();
	const setActiveOrgId = useSetPersistedActiveOrganizationId();

	const [status, setStatus] = useState<AutoRegisterStatus>({ status: "idle" });
	const inFlightRef = useRef(false);
	const lastFailedPhaseRef = useRef<"register" | "bootstrap" | null>(null);

	const walletAddress = wallet?.account.address;
	const token = thirdwebAuthToken?.trim();

	const orgCount = orgsQuery.data?.organizations?.length ?? 0;
	const orgsReady =
		isRegistered.data === true && !orgsQuery.isPending && orgsQuery.isSuccess;

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
		setStatus({ status: "registering" });
		await login.mutateAsync({
			idToken: token,
			accessGate: readStoredAccessGate() ?? undefined,
		});
		clearStoredAccessGate();
	}, [login, token]);

	const runFlow = useCallback(
		async (skipRegister: boolean) => {
			if (inFlightRef.current) return;
			inFlightRef.current = true;
			let phase: "register" | "bootstrap" = skipRegister
				? "bootstrap"
				: "register";
			try {
				if (!skipRegister) {
					await runRegister();
					phase = "bootstrap";
				}
				await runBootstrap();
				lastFailedPhaseRef.current = null;
				setStatus({ status: "completed" });
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Account setup failed";
				lastFailedPhaseRef.current = phase;
				setStatus({ status: "failed", phase, error: message });
			} finally {
				inFlightRef.current = false;
			}
		},
		[runBootstrap, runRegister],
	);

	const retry = useCallback(() => {
		const skipRegister =
			isRegistered.data === true || lastFailedPhaseRef.current === "bootstrap";
		void runFlow(skipRegister);
	}, [isRegistered.data, runFlow]);

	useEffect(() => {
		if (!ready || !authenticated || !walletAddress || !token) return;
		if (isRegistered.isPending) return;
		if (inFlightRef.current) return;
		if (status.status === "completed" || status.status === "failed") return;

		if (isRegistered.data === true) {
			if (!orgsReady) return;
			if (orgCount > 0) {
				setStatus({ status: "completed" });
				return;
			}
			void runFlow(true);
			return;
		}

		if (isRegistered.data === false) {
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
		status.status,
		token,
		walletAddress,
	]);

	const isBlocking = useMemo(
		() =>
			status.status === "registering" ||
			status.status === "bootstrapping" ||
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
