import { ArrowLeftIcon, FileTextIcon } from "@phosphor-icons/react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppEmptyState } from "@/src/lib/components/app/empty-state";
import { Button } from "@/src/lib/components/ui/button";
import type { SignDocumentContextValue } from "@/src/routes/dashboard/document/sign/-lib/context/context";
import { useSignDocumentController } from "@/src/routes/dashboard/document/sign/-lib/hooks/use-document";
import { Sign } from "./ui";

function SignDocumentEmpty() {
	const navigate = useNavigate();

	return (
		<div className="flex min-h-screen items-center justify-center p-8">
			<AppEmptyState
				preset="page"
				icon={FileTextIcon}
				title="No document specified"
				description="Open a document from your dashboard or use a signing link."
			>
				<Button
					variant="outline"
					onClick={() => navigate({ to: "/dashboard" })}
				>
					<ArrowLeftIcon className="size-4 mr-2" />
					Back
				</Button>
			</AppEmptyState>
		</div>
	);
}

function SignDocumentLoaded({ pieceCid }: { pieceCid: string }) {
	const sign = useSignDocumentController();
	const file = sign.fileQuery.file;

	const value = useMemo(
		(): SignDocumentContextValue => ({
			sign,
			pieceCid,
			file,
		}),
		[sign, pieceCid, file],
	);

	return (
		<Sign.Root value={value}>
			<Sign.Shell>
				<Sign.Dialogs />
			</Sign.Shell>
		</Sign.Root>
	);
}

export function SignDocumentPage() {
	const search = useSearch({ from: "/dashboard/document/sign/" });
	const pieceCid = search.pieceCid?.trim() ?? "";

	if (!pieceCid) {
		return <SignDocumentEmpty />;
	}

	return <SignDocumentLoaded pieceCid={pieceCid} />;
}
