import { ArrowLeftIcon, FileTextIcon } from "@phosphor-icons/react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useMemo } from "react";
import { Button } from "@/src/lib/components/ui/button";
import type { SignDocumentContextValue } from "@/src/routes/dashboard/document/sign/-lib/context/context";
import { useSignDocument } from "@/src/routes/dashboard/document/sign/-lib/hooks/use-controller";
import { Sign } from "./ui";

function SignDocumentEmpty() {
	const navigate = useNavigate();

	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-3 p-8">
			<FileTextIcon className="size-14 text-muted-foreground" />
			<p className="text-sm text-muted-foreground">No document specified.</p>
			<Button variant="outline" onClick={() => navigate({ to: "/dashboard" })}>
				<ArrowLeftIcon className="size-4 mr-2" />
				Back
			</Button>
		</div>
	);
}

function SignDocumentLoaded({ pieceCid }: { pieceCid: string }) {
	const sign = useSignDocument();
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
