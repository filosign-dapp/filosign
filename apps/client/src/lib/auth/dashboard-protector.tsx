import { useCreateOrganization, useOrganizations } from "@filosign/react/orgs";
import { useUserProfile } from "@filosign/react/users";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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
import { toastUser } from "@/src/lib/copy/toast";
import { TOASTS } from "@/src/lib/copy/toasts";
import { showAppErrorToast, suppressGlobalErrorToast } from "@/src/lib/errors";
import { useSetPersistedActiveOrganizationId } from "@/src/lib/filosign/persisted-active-org";
import { navigateToReturnTo } from "./return-to";
import { SessionProtector } from "./session-protector";

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
	const { data: orgsData, isLoading: orgsLoading } = useOrganizations();

	if (orgsLoading) {
		return <SessionProtector>{children}</SessionProtector>;
	}

	const orgs = orgsData?.organizations ?? [];
	if (orgs.length === 0) {
		return (
			<SessionProtector>
				<WorkspaceSetupGate />
			</SessionProtector>
		);
	}

	return <SessionProtector>{children}</SessionProtector>;
}
