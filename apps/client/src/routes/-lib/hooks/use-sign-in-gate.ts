import { useFilosignContext } from "@filosign/react";
import {
	CLIENT_ANALYTICS_EVENTS,
	useCaptureAppEvent,
	useIdentifyAnalyticsWallet,
} from "@filosign/react/analytics";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useConnect } from "thirdweb/react";
import { clientSignupPolicyIsGated } from "@/src/lib/deployment";
import type { ColdInviteEntrySearch } from "@/src/lib/domains/invites/cold-invite-search";
import {
	connectFilosignInAppWalletWithEmailOtp,
	sendThirdwebEmailOtp,
} from "@/src/lib/web3/gated-email-auth";
import {
	accessGateFromSearch,
	storeAccessGate,
} from "@/src/lib/web3/platform-access-session";
import { previewGateWithSetupPolling } from "@/src/routes/-lib/utils/poll-setup-gate";

export type SignInGateState =
	| { status: "loading" }
	| { status: "fetching_setup" }
	| { status: "blocked"; reason: string }
	| {
			status: "ready";
			gate: string;
			lockedEmail: string;
			planLabel: string | null;
			needsEmailInput: boolean;
	  };

export type SignInOtpDialogStep = "email" | "otp" | "not_registered";

const NOT_REGISTERED_REASON = "No account found for this email";

export function useSignInGate(search: ColdInviteEntrySearch) {
	const { rpc } = useFilosignContext();
	const captureAppEvent = useCaptureAppEvent();
	const identifyAnalyticsWallet = useIdentifyAnalyticsWallet();
	const { connect: registerThirdwebWallet } = useConnect();
	const gated = clientSignupPolicyIsGated();

	const [emailInput, setEmailInput] = useState(search.email?.trim() ?? "");
	const [otpCode, setOtpCode] = useState("");
	const [otpSent, setOtpSent] = useState(false);
	const [authError, setAuthError] = useState<string | null>(null);
	const [authPending, setAuthPending] = useState(false);
	const [otpDialogOpen, setOtpDialogOpen] = useState(false);
	const [otpDialogStep, setOtpDialogStep] =
		useState<SignInOtpDialogStep>("email");
	const [dialogPlanLabel, setDialogPlanLabel] = useState<string | null>(null);

	const hasSetupToken = Boolean(search.setup?.trim());
	const hasDeepLinkGate = Boolean(
		search.platformInvite?.trim() ||
			search.setup?.trim() ||
			(search.coldInvite?.trim() && search.coldPieceCid?.trim()) ||
			search.email?.trim(),
	);
	const showLoginHome = gated && !hasDeepLinkGate;

	const previewQuery = useQuery({
		queryKey: [
			"platform-access-preview",
			search.platformInvite,
			search.setup,
			search.coldInvite,
			search.coldPieceCid,
			search.email,
			gated,
			hasDeepLinkGate,
		] as const,
		enabled: gated && hasDeepLinkGate,
		queryFn: async () =>
			previewGateWithSetupPolling(
				(args) => rpc.platformAccess.previewGate(args),
				{
					platformInvite: search.platformInvite || undefined,
					setup: search.setup || undefined,
					coldInvite: search.coldInvite || undefined,
					coldPieceCid: search.coldPieceCid || undefined,
					email: search.email || emailInput || undefined,
				},
			),
		staleTime: 30_000,
	});

	const gateState: SignInGateState = useMemo(() => {
		if (!gated) {
			return {
				status: "ready",
				gate: "open",
				lockedEmail: "",
				planLabel: null,
				needsEmailInput: false,
			};
		}
		if (showLoginHome) {
			return {
				status: "ready",
				gate: "login_home",
				lockedEmail: "",
				planLabel: null,
				needsEmailInput: false,
			};
		}
		if (previewQuery.isPending || (previewQuery.isFetching && hasSetupToken)) {
			return hasSetupToken
				? { status: "fetching_setup" }
				: { status: "loading" };
		}
		if (previewQuery.isError) {
			return {
				status: "blocked",
				reason: "Could not verify access. Try again shortly.",
			};
		}
		const data = previewQuery.data;
		if (!data?.valid) {
			return {
				status: "blocked",
				reason:
					data?.reason ??
					"Open the link from your email or purchase a plan to get started.",
			};
		}
		const lockedEmail = data.lockedEmail?.trim() ?? "";
		const needsEmailInput = data.gate === "platform_invite" && !lockedEmail;
		return {
			status: "ready",
			gate: data.gate ?? "returning_user",
			lockedEmail,
			planLabel: data.planLabel ?? null,
			needsEmailInput,
		};
	}, [
		gated,
		hasSetupToken,
		showLoginHome,
		previewQuery.data,
		previewQuery.isError,
		previewQuery.isFetching,
		previewQuery.isPending,
	]);

	useEffect(() => {
		if (gateState.status === "ready" && gated && !showLoginHome) {
			storeAccessGate(accessGateFromSearch(search));
		}
	}, [gateState.status, gated, search, showLoginHome]);

	const effectiveEmail = useMemo(() => {
		if (gateState.status === "ready" && gateState.lockedEmail) {
			return gateState.lockedEmail;
		}
		return emailInput.trim().toLowerCase();
	}, [emailInput, gateState]);

	const isReturningUser =
		gateState.status === "ready" && gateState.gate === "returning_user";

	const isAdminBootstrap =
		gateState.status === "ready" && gateState.gate === "admin_bootstrap";

	const closeOtpDialog = useCallback(() => {
		setOtpDialogOpen(false);
		setOtpCode("");
		setOtpSent(false);
		setAuthError(null);
		setDialogPlanLabel(null);
		setOtpDialogStep("email");
	}, []);

	const beginLogin = useCallback(() => {
		setAuthError(null);
		setDialogPlanLabel(null);
		setOtpDialogStep("email");
		setOtpDialogOpen(true);
	}, []);

	const submitLoginEmail = useCallback(async () => {
		setAuthError(null);
		const email = emailInput.trim().toLowerCase();
		if (!email) {
			setAuthError("Enter your email to continue.");
			return;
		}
		setAuthPending(true);
		try {
			const check = await rpc.platformAccess.previewGate({
				platformInvite: search.platformInvite || undefined,
				setup: search.setup || undefined,
				coldInvite: search.coldInvite || undefined,
				coldPieceCid: search.coldPieceCid || undefined,
				email,
			});
			if (!check.valid) {
				if (check.reason === NOT_REGISTERED_REASON) {
					setOtpDialogStep("not_registered");
					return;
				}
				setAuthError(check.reason ?? "Email not allowed to sign in.");
				return;
			}
			setDialogPlanLabel(check.planLabel ?? null);
			await sendThirdwebEmailOtp(email);
			setOtpSent(true);
			setOtpDialogStep("otp");
		} catch (err) {
			setAuthError(
				err instanceof Error ? err.message : "Failed to send verification code",
			);
		} finally {
			setAuthPending(false);
		}
	}, [emailInput, rpc.platformAccess, search]);

	const sendOtp = useCallback(async (): Promise<boolean> => {
		setAuthError(null);
		const email = effectiveEmail;
		if (!email) {
			setAuthError("Enter your email to continue.");
			return false;
		}
		if (gated) {
			const check = await rpc.platformAccess.previewGate({
				platformInvite: search.platformInvite || undefined,
				setup: search.setup || undefined,
				coldInvite: search.coldInvite || undefined,
				coldPieceCid: search.coldPieceCid || undefined,
				email,
			});
			if (!check.valid) {
				setAuthError(check.reason ?? "Email not allowed for this link.");
				return false;
			}
			setDialogPlanLabel(check.planLabel ?? null);
		}
		setAuthPending(true);
		try {
			await sendThirdwebEmailOtp(email);
			setOtpSent(true);
			return true;
		} catch (err) {
			setAuthError(
				err instanceof Error ? err.message : "Failed to send verification code",
			);
			return false;
		} finally {
			setAuthPending(false);
		}
	}, [effectiveEmail, gated, rpc.platformAccess, search]);

	const beginEmailAuth = useCallback(async () => {
		setAuthError(null);
		if (gateState.status !== "ready") return;
		if (showLoginHome) {
			beginLogin();
			return;
		}
		if (gateState.needsEmailInput) {
			setOtpDialogStep("email");
			setOtpDialogOpen(true);
			return;
		}
		if (!effectiveEmail) {
			setAuthError("Enter your email to continue.");
			return;
		}
		const sent = await sendOtp();
		if (sent) {
			setOtpDialogStep("otp");
			setOtpDialogOpen(true);
		}
	}, [beginLogin, effectiveEmail, gateState, sendOtp, showLoginHome]);

	const submitEmailAndSendOtp = useCallback(async () => {
		if (showLoginHome) {
			await submitLoginEmail();
			return;
		}
		const sent = await sendOtp();
		if (sent) {
			setOtpDialogStep("otp");
		}
	}, [sendOtp, showLoginHome, submitLoginEmail]);

	const verifyOtp = useCallback(async () => {
		setAuthError(null);
		const email = effectiveEmail;
		if (!email || !otpCode.trim()) {
			setAuthError("Enter the verification code from your email.");
			return null;
		}
		setAuthPending(true);
		try {
			const wallet = await registerThirdwebWallet(async () =>
				connectFilosignInAppWalletWithEmailOtp({
					email,
					verificationCode: otpCode,
				}),
			);
			const account = wallet?.getAccount();
			if (!account?.address) {
				setAuthError("Invalid verification code");
				return null;
			}
			captureAppEvent(CLIENT_ANALYTICS_EVENTS.walletSignup, {});
			identifyAnalyticsWallet(account.address);
			storeAccessGate({
				...accessGateFromSearch(search),
				...(email && !search.email ? { coldRecipientEmail: email } : {}),
			});
			closeOtpDialog();
			return account;
		} catch (err) {
			setAuthError(
				err instanceof Error ? err.message : "Invalid verification code",
			);
			return null;
		} finally {
			setAuthPending(false);
		}
	}, [
		captureAppEvent,
		closeOtpDialog,
		effectiveEmail,
		identifyAnalyticsWallet,
		otpCode,
		registerThirdwebWallet,
		search,
	]);

	return {
		gated,
		hasSetupToken,
		showLoginHome,
		gateState,
		isReturningUser,
		isAdminBootstrap,
		emailInput,
		setEmailInput,
		otpCode,
		setOtpCode,
		otpSent,
		authError,
		authPending,
		effectiveEmail,
		otpDialogOpen,
		otpDialogStep,
		dialogPlanLabel,
		beginLogin,
		submitLoginEmail,
		beginEmailAuth,
		submitEmailAndSendOtp,
		closeOtpDialog,
		sendOtp,
		verifyOtp,
		refetchGate: previewQuery.refetch,
	};
}

export type SignInGateController = ReturnType<typeof useSignInGate>;
