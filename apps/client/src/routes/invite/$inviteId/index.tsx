import { createFileRoute } from "@tanstack/react-router";
import { InvitePage } from "./-components/page";
import { InviteProvider } from "./-lib/context/context";
import { useInviteController } from "./-lib/hooks/use-invite-controller";

function InviteRoutePage() {
	const controller = useInviteController();
	return (
		<InviteProvider value={controller}>
			<InvitePage />
		</InviteProvider>
	);
}

export const Route = createFileRoute("/invite/$inviteId/")({
	component: InviteRoutePage,
});
