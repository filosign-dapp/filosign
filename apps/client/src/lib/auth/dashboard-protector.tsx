import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader } from "@/src/lib/components/ui/loader";
import { hydrationMark } from "@/src/lib/utils/hydration-lifecycle";
import { RecoveryPhraseGate } from "./recovery-phrase-gate";
import { useWalletUnlock } from "./use-wallet-unlock";

interface DashboardProtectorProps {
	children: React.ReactNode;
}

export default function DashboardProtector({
	children,
}: DashboardProtectorProps) {
	const navigate = useNavigate();
	const unlock = useWalletUnlock({ enabled: true });
	const { derived, showRecoveryGate, tryingWalletUnlock } = unlock;

	useEffect(() => {
		if (derived.shouldRedirectToSignIn) {
			void navigate({ to: "/" });
		}
	}, [derived.shouldRedirectToSignIn, navigate]);

	const shouldShowLoader =
		derived.shouldShowBootstrapLoader || tryingWalletUnlock;

	useEffect(() => {
		hydrationMark("dashboard-protector:ui-state", {
			shouldShowLoader,
			showRecoveryGate,
			filosignSessionActive: derived.filosignSessionActive,
			shouldRedirectToSignIn: derived.shouldRedirectToSignIn,
			tryingWalletUnlock,
			shouldShowBootstrapLoader: derived.shouldShowBootstrapLoader,
		});
	}, [
		shouldShowLoader,
		showRecoveryGate,
		derived.filosignSessionActive,
		derived.shouldRedirectToSignIn,
		tryingWalletUnlock,
		derived.shouldShowBootstrapLoader,
	]);

	if (shouldShowLoader) {
		return <Loader />;
	}

	if (showRecoveryGate) {
		return (
			<RecoveryPhraseGate
				phraseInputId="dashboard-recovery-phrase"
				recoveryPhrase={unlock.recoveryPhrase}
				onRecoveryPhraseChange={unlock.setRecoveryPhrase}
				error={unlock.error}
				onRecover={() => void unlock.handleRecover()}
				onCancel={() => {
					unlock.resetRecoveryGate();
					void navigate({ to: "/" });
				}}
				isRecoverPending={unlock.recoverWithPhrase.isPending}
				isLoginPending={unlock.login.isPending}
			/>
		);
	}

	if (!derived.filosignSessionActive) {
		return <Loader />;
	}

	return <>{children}</>;
}
