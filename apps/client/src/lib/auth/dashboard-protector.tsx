import { useCreateOrganization, useOrganizations } from "@filosign/react/orgs";
import { useUserProfile } from "@filosign/react/users";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/src/lib/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/src/lib/components/ui/card";
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";
import { Loader } from "@/src/lib/components/ui/loader";
import { useSetPersistedActiveOrganizationId } from "@/src/lib/filosign/persisted-active-org";
import { hydrationMark } from "@/src/lib/utils/hydration-lifecycle";
import { RecoveryPhraseGate } from "./recovery-phrase-gate";
import { useWalletUnlock } from "./use-wallet-unlock";

interface DashboardProtectorProps {
	children: React.ReactNode;
}

function WorkspaceSetupGate() {
	const createOrg = useCreateOrganization();
	const setActiveOrg = useSetPersistedActiveOrganizationId();
	const { data: userProfile } = useUserProfile();
	const [name, setName] = useState("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const orgName =
			name.trim() ||
			(userProfile?.firstName
				? `${userProfile.firstName}'s Workspace`
				: "My Workspace");
		try {
			const res = await createOrg.mutateAsync({ name: orgName });
			if (res?.organization?.id) {
				setActiveOrg(res.organization.id);
				toast.success("Workspace created successfully!");
			}
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to create workspace",
			);
		}
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-6">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>Create your workspace</CardTitle>
					<CardDescription>
						All drafts and documents in Filosign are scoped to a workspace. Set
						up your first workspace to get started.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="workspace-name">Workspace Name</Label>
							<Input
								id="workspace-name"
								placeholder={
									userProfile?.firstName
										? `${userProfile.firstName}'s Workspace`
										: "My Workspace"
								}
								value={name}
								onChange={(e) => setName(e.target.value)}
							/>
						</div>
						<Button
							type="submit"
							className="w-full"
							variant="primary"
							disabled={createOrg.isPending}
						>
							{createOrg.isPending ? "Creating Workspace…" : "Create Workspace"}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}

export default function DashboardProtector({
	children,
}: DashboardProtectorProps) {
	const navigate = useNavigate();
	const unlock = useWalletUnlock({ enabled: false });
	const { derived, showRecoveryGate, tryingWalletUnlock } = unlock;

	const { data: orgsData, isLoading: orgsLoading } = useOrganizations();

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

	if (shouldShowLoader || (derived.filosignSessionActive && orgsLoading)) {
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

	const orgs = orgsData?.organizations ?? [];
	if (orgs.length === 0) {
		return <WorkspaceSetupGate />;
	}

	return <>{children}</>;
}
