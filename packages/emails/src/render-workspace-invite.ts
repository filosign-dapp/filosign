import { render } from "@react-email/render";
import WorkspaceInviteEmail, {
	type WorkspaceInviteEmailProps,
} from "../emails/workspace-invite";
import { workspaceInviteSubject } from "./copy/workspace-invite";

export type { WorkspaceInviteEmailProps } from "../emails/workspace-invite";

export { workspaceInviteSubject };

export async function renderWorkspaceInvite(
	props: WorkspaceInviteEmailProps,
): Promise<{ html: string; text: string; subject: string }> {
	const element = WorkspaceInviteEmail(props);
	const html = await render(element);
	const text = await render(element, { plainText: true });
	return {
		html,
		text,
		subject: workspaceInviteSubject(props.orgName),
	};
}
