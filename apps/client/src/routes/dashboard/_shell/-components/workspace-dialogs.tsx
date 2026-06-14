import {
	useCreateOrganization,
	useInviteOrgMember,
} from "@filosign/react/orgs";
import type { FormEvent } from "react";
import { useId, useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import { Dialog } from "@/src/lib/components/ui/dialog";
import {
	FeatureDialogActions,
	FeatureDialogBody,
	FeatureDialogClose,
	FeatureDialogContent,
	FeatureDialogHeader,
	FeatureDialogMedia,
	FeatureDialogPanel,
} from "@/src/lib/components/ui/feature-dialog";
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";
import { toastUser } from "@/src/lib/copy/toast";
import { TOASTS } from "@/src/lib/copy/toasts";
import { FEATURE_DIALOG_IMAGES } from "@/src/lib/domains/feature-dialog/images";
import { useSetPersistedActiveOrganizationId } from "@/src/lib/filosign/persisted-active-org";

export function CreateWorkspaceDialog(props: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const titleId = useId();
	const createOrg = useCreateOrganization();
	const setActiveOrg = useSetPersistedActiveOrganizationId();
	const [name, setName] = useState("");

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;
		try {
			const res = await createOrg.mutateAsync({ name: name.trim() });
			if (res?.organization?.id) {
				setActiveOrg(res.organization.id);
				toastUser.success(TOASTS.workspace.created);
				props.onOpenChange(false);
				setName("");
			}
		} catch {}
	};

	return (
		<Dialog open={props.open} onOpenChange={props.onOpenChange}>
			<FeatureDialogContent aria-labelledby={titleId}>
				<FeatureDialogMedia
					src={FEATURE_DIALOG_IMAGES.workspaceCreateInviteTrialDialog}
					badge="New workspace"
				/>

				<FeatureDialogPanel>
					<FeatureDialogClose disabled={createOrg.isPending} />

					<FeatureDialogHeader
						badge="New workspace"
						title="Create new workspace"
						titleId={titleId}
						description="A workspace is where you work, organize drafts, and invite members."
					/>

					<FeatureDialogBody>
						<form onSubmit={handleSubmit} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="create-workspace-name">Workspace Name</Label>
								<Input
									id="create-workspace-name"
									placeholder="Acme Corp"
									value={name}
									onChange={(e) => setName(e.target.value)}
									autoFocus
									disabled={createOrg.isPending}
								/>
							</div>

							<FeatureDialogActions>
								<Button
									type="submit"
									variant="primary"
									size="lg"
									className="w-full"
									disabled={createOrg.isPending || !name.trim()}
									isLoading={createOrg.isPending}
								>
									{createOrg.isPending ? "Creating..." : "Create Workspace"}
								</Button>
								<Button
									type="button"
									variant="outline"
									size="lg"
									className="w-full"
									onClick={() => props.onOpenChange(false)}
									disabled={createOrg.isPending}
								>
									Cancel
								</Button>
							</FeatureDialogActions>
						</form>
					</FeatureDialogBody>
				</FeatureDialogPanel>
			</FeatureDialogContent>
		</Dialog>
	);
}

export function InviteTeammateDialog(props: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const titleId = useId();
	const inviteMember = useInviteOrgMember();
	const [email, setEmail] = useState("");

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		if (!email.trim()) return;
		try {
			await inviteMember.mutateAsync({ email: email.trim() });
			toastUser.success(TOASTS.workspace.teammateInvited);
			setEmail("");
			props.onOpenChange(false);
		} catch {}
	};

	return (
		<Dialog open={props.open} onOpenChange={props.onOpenChange}>
			<FeatureDialogContent aria-labelledby={titleId}>
				<FeatureDialogMedia
					src={FEATURE_DIALOG_IMAGES.workspaceCreateInviteTrialDialog}
					badge="Invite teammate"
				/>

				<FeatureDialogPanel>
					<FeatureDialogClose disabled={inviteMember.isPending} />

					<FeatureDialogHeader
						badge="Invite teammate"
						title="Invite teammate to workspace"
						titleId={titleId}
						description="Enter your teammate's email address. Once they register or login, they will be automatically added to this workspace."
					/>

					<FeatureDialogBody>
						<form onSubmit={handleSubmit} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="invite-teammate-email">Email Address</Label>
								<Input
									id="invite-teammate-email"
									type="email"
									placeholder="colleague@company.com"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									autoFocus
									disabled={inviteMember.isPending}
								/>
							</div>

							<FeatureDialogActions>
								<Button
									type="submit"
									variant="primary"
									size="lg"
									className="w-full"
									disabled={inviteMember.isPending || !email.includes("@")}
									isLoading={inviteMember.isPending}
								>
									{inviteMember.isPending ? "Inviting..." : "Invite"}
								</Button>
								<Button
									type="button"
									variant="outline"
									size="lg"
									className="w-full"
									onClick={() => props.onOpenChange(false)}
									disabled={inviteMember.isPending}
								>
									Cancel
								</Button>
							</FeatureDialogActions>
						</form>
					</FeatureDialogBody>
				</FeatureDialogPanel>
			</FeatureDialogContent>
		</Dialog>
	);
}
