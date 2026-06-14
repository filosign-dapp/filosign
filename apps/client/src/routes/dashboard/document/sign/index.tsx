import { FileTextIcon } from "@phosphor-icons/react";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import { usePersonalizationGateForSign } from "@/src/lib/auth/use-personalization-gate-for-sign";
import { RoutePendingFallback } from "@/src/lib/components/app/suspense";
import { usePrefetchDefaultSignatures } from "@/src/routes/dashboard/document/sign/-lib/hooks/use-prefetch-default-signatures";
import { EntitlementUpgradeProvider } from "@/src/routes/dashboard/envelope/create/-lib/context/entitlement-upgrade-context";
import { SignInviteUnlockRoutePage } from "./-components/invite-unlock/page";
import { SignDocumentPage } from "./-components/page";
import { SignPieceFileProvider } from "./-lib/context/piece-file-context";

function SignDocumentRoutePage() {
	usePersonalizationGateForSign();
	usePrefetchDefaultSignatures();
	const search = useSearch({ from: "/dashboard/document/sign/" });
	const invite = search.invite?.trim() ?? "";
	const pieceCid = search.pieceCid?.trim() ?? "";

	if (invite && !pieceCid) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4">
				<FileTextIcon className="size-14 text-muted-foreground" />
				<h1 className="text-lg font-semibold">Invalid document link</h1>
				<p className="text-sm text-muted-foreground text-center max-w-sm">
					This invite link is missing the document id. Ask the sender to resend
					the email.
				</p>
			</div>
		);
	}

	if (invite && pieceCid) {
		return (
			<SignPieceFileProvider pieceCid={pieceCid}>
				<SignInviteUnlockRoutePage />
			</SignPieceFileProvider>
		);
	}

	if (!pieceCid) {
		return <SignDocumentPage />;
	}

	return (
		<SignPieceFileProvider pieceCid={pieceCid}>
			<SignDocumentPage />
		</SignPieceFileProvider>
	);
}

export const Route = createFileRoute("/dashboard/document/sign/")({
	validateSearch: z.object({
		pieceCid: z.string().optional().default(""),
		invite: z.string().optional().default(""),
	}),
	component: () => (
		<EntitlementUpgradeProvider>
			<SignDocumentRoutePage />
		</EntitlementUpgradeProvider>
	),
	pendingComponent: RoutePendingFallback,
});
