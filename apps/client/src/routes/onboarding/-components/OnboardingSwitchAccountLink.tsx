import { useFilosignContext } from "@filosign/react";
import { useLogout } from "@filosign/react/auth";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import {
	type ColdInviteEntrySearch,
	extractSignInEntrySearchFromLocation,
	hasSignInEntryParams,
	SKIP_COLD_SIGN_AFTER_MISMATCH,
} from "@/src/lib/domains/invites/cold-invite-search";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { cn } from "@/src/lib/utils";
import { logger } from "@/src/lib/utils/logger";
import { safeAsync } from "@/src/lib/utils/safe";
import {
	accessGateFromSearch,
	clearStoredAccessGate,
	readStoredAccessGate,
	storeAccessGate,
} from "@/src/lib/web3/platform-access-session";
import { useThirdweb } from "@/src/lib/web3/use-thirdweb";

export type ExecuteSwitchAccountLogoutArgs = {
	clearOnboardingForm: () => void;
	wallet: ReturnType<typeof useFilosignContext>["wallet"];
	logoutFilosign: ReturnType<typeof useLogout>;
	logoutWallet: () => Promise<void>;
	navigate: ReturnType<typeof useNavigate>;
	/** When true, skip navigating home (stay on cold-invite URL, etc.). */
	stayAfterLogout: boolean;
	onStayAfterLogout?: () => void;
};

/** Clears onboarding draft, logs out Filosign + wallet; optionally stays on the current route. */
export async function executeSwitchAccountLogout(
	args: ExecuteSwitchAccountLogoutArgs,
): Promise<void> {
	const preservedSearch = extractSignInEntrySearchFromLocation();
	const storedGate = readStoredAccessGate();
	const gateToRestore = {
		...storedGate,
		...(preservedSearch ? accessGateFromSearch(preservedSearch) : {}),
	};

	args.clearOnboardingForm();
	clearStoredAccessGate();
	if (args.wallet) {
		const [, err] = await safeAsync(() => args.logoutFilosign.mutateAsync());
		if (err) {
			logger.error("Filosign logout before switch account:", err);
		}
	}
	const [, walletErr] = await safeAsync(() => args.logoutWallet());
	if (walletErr) {
		logger.error("Wallet logout (switch account):", walletErr);
	}

	if (Object.keys(gateToRestore).length > 0) {
		storeAccessGate(gateToRestore);
	}

	if (args.stayAfterLogout) {
		args.onStayAfterLogout?.();
		return;
	}

	const navigateSearch: ColdInviteEntrySearch | undefined = (() => {
		if (preservedSearch) return preservedSearch;
		if (!storedGate?.platformInviteToken && !storedGate?.setupToken) {
			return undefined;
		}
		return {
			coldPieceCid: "",
			coldInvite: "",
			email: storedGate.coldRecipientEmail ?? "",
			platformInvite: storedGate.platformInviteToken ?? "",
			setup: storedGate.setupToken ?? "",
			skipColdSign: "",
		};
	})();

	if (navigateSearch && hasSignInEntryParams(navigateSearch)) {
		await args.navigate({ to: "/", search: navigateSearch });
		return;
	}

	await args.navigate({ to: "/" });
}

export function OnboardingSwitchAccountLink({
	className,
	stayAfterLogout = false,
	onStayAfterLogout,
	coldInviteMismatch = false,
	continueAnywayColdSearch,
}: {
	className?: string;
	/** If true, do not navigate away after logout (e.g. cold-invite sign URL should show intro again). */
	stayAfterLogout?: boolean;
	onStayAfterLogout?: () => void;
	/** When true with cold search, show “Continue anyway” to onboarding (skips opening the cold document after setup). */
	coldInviteMismatch?: boolean;
	continueAnywayColdSearch?: { coldPieceCid: string; coldInvite: string };
}) {
	const { wallet } = useFilosignContext();
	const { logout: logoutWallet, email: loggedInEmail } = useThirdweb();
	const logoutFilosign = useLogout();
	const clearOnboardingForm = useStorePersist((s) => s.clearOnboardingForm);
	const navigate = useNavigate();
	const [pending, setPending] = useState(false);

	const showContinueAnyway =
		coldInviteMismatch &&
		Boolean(continueAnywayColdSearch?.coldPieceCid?.trim()) &&
		Boolean(continueAnywayColdSearch?.coldInvite?.trim());

	const handleClick = async () => {
		setPending(true);
		try {
			await executeSwitchAccountLogout({
				clearOnboardingForm,
				wallet,
				logoutFilosign,
				logoutWallet,
				navigate,
				stayAfterLogout,
				onStayAfterLogout,
			});
		} finally {
			setPending(false);
		}
	};

	const handleContinueAnyway = () => {
		if (!continueAnywayColdSearch) return;
		void navigate({
			to: "/onboarding",
			search: {
				coldPieceCid: continueAnywayColdSearch.coldPieceCid,
				coldInvite: continueAnywayColdSearch.coldInvite,
				skipColdSign: SKIP_COLD_SIGN_AFTER_MISMATCH,
			},
		});
	};

	return (
		<div
			className={cn("flex w-full flex-col items-center text-center", className)}
		>
			{showContinueAnyway ? (
				<>
					<p className="text-muted-foreground max-w-full px-2 text-sm break-all">
						You may still continue to your dashboard anyway.
					</p>
					<Button
						type="button"
						variant="link"
						className="text-muted-foreground h-auto min-h-0 px-2 py-1 text-sm"
						disabled={pending}
						onClick={handleContinueAnyway}
					>
						Continue to dashboard
					</Button>
				</>
			) : (
				<div className="mt-4">
					{loggedInEmail ? (
						<p className="text-muted-foreground max-w-full px-2 text-sm break-all">
							You&apos;re signed in as{" "}
							<span className="font-medium text-foreground">
								{loggedInEmail}
							</span>
						</p>
					) : null}
					<Button
						type="button"
						variant="link"
						className="text-muted-foreground h-auto min-h-0 px-2 py-1 text-sm"
						disabled={pending}
						onClick={() => void handleClick()}
					>
						{pending ? "Switching…" : "Switch account"}
					</Button>
				</div>
			)}
		</div>
	);
}
