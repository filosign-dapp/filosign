import { useCreateOrganization, useOrganizations } from "@filosign/react/orgs";
import { useUserProfile } from "@filosign/react/users";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { toastUser } from "@/src/lib/copy/toast";
import { TOASTS } from "@/src/lib/copy/toasts";
import { showAppErrorToast, suppressGlobalErrorToast } from "@/src/lib/errors";
import { useSetPersistedActiveOrganizationId } from "@/src/lib/filosign/persisted-active-org";
import { hydrationMark } from "@/src/lib/utils/hydration-lifecycle";
import { navigateToReturnTo, stashReturnTo } from "./return-to";
import { ReturnToHandler } from "./return-to-handler";
import { useSessionGateDerived, useSessionGateFlags } from "./use-session-gate";

interface DashboardProtectorProps {
	children: React.ReactNode;
}

function WorkspaceSetupGate() {
	const navigate = useNavigate();
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
			const res = await createOrg.mutateAsync(
				{ name: orgName },
				suppressGlobalErrorToast(),
			);
			if (res?.organization?.id) {
				setActiveOrg(res.organization.id);
				toastUser.success(TOASTS.workspace.created);
				requestAnimationFrame(() => {
					navigateToReturnTo(navigate);
				});
			}
		} catch (err) {
			showAppErrorToast(err);
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
	const flags = useSessionGateFlags();
	const derived = useSessionGateDerived(flags);

	const { data: orgsData, isLoading: orgsLoading } = useOrganizations();

	useEffect(() => {
		if (derived.shouldRedirectToSignIn) {
			stashReturnTo();
			const params = new URLSearchParams(window.location.search);
			const upgrade = params.get("upgrade") || undefined;
			const interval = params.get("interval") || undefined;

			void navigate({
				to: "/",
				search: (prev) => ({
					...prev,
					...(upgrade ? { upgrade } : {}),
					...(interval ? { interval } : {}),
				}),
			});
		}
	}, [derived.shouldRedirectToSignIn, navigate]);

	const shouldShowLoader = derived.shouldShowBootstrapLoader;

	useEffect(() => {
		hydrationMark("dashboard-protector:ui-state", {
			shouldShowLoader,
			filosignSessionActive: derived.filosignSessionActive,
			shouldRedirectToSignIn: derived.shouldRedirectToSignIn,
			shouldShowBootstrapLoader: derived.shouldShowBootstrapLoader,
		});
	}, [
		shouldShowLoader,
		derived.filosignSessionActive,
		derived.shouldRedirectToSignIn,
		derived.shouldShowBootstrapLoader,
	]);

	if (shouldShowLoader) {
		return <Loader />;
	}

	if (!derived.filosignSessionActive) {
		return <Loader />;
	}

	if (orgsLoading) {
		return (
			<>
				<ReturnToHandler />
				{children}
			</>
		);
	}

	const orgs = orgsData?.organizations ?? [];
	if (orgs.length === 0) {
		return <WorkspaceSetupGate />;
	}

	return (
		<>
			<ReturnToHandler />
			{children}
		</>
	);
}
