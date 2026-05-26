import { ArrowLeftIcon, FileTextIcon } from "@phosphor-icons/react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Button } from "@/src/lib/components/ui/button";
import { useSignDocument } from "@/src/routes/dashboard/document/sign/-lib/hooks/use-controller";
import { Sign } from "./ui";

type SignDocumentPageProps = {
	skipInviteUnlock?: boolean;
};

export function SignDocumentPage({
	skipInviteUnlock: _skip,
}: SignDocumentPageProps = {}) {
	const navigate = useNavigate();
	const search = useSearch({ from: "/dashboard/document/sign/" });
	const pieceCid = search.pieceCid?.trim() ?? "";

	if (!pieceCid) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center gap-3 p-8">
				<FileTextIcon className="size-14 text-muted-foreground" />
				<p className="text-sm text-muted-foreground">No document specified.</p>
				<Button
					variant="outline"
					onClick={() => navigate({ to: "/dashboard" })}
				>
					<ArrowLeftIcon className="size-4 mr-2" />
					Back
				</Button>
			</div>
		);
	}

	const sign = useSignDocument();

	return (
		<Sign.Root value={{ sign, pieceCid, file: sign.fileQuery.file }}>
			<Sign.Shell>
				<Sign.Dialogs />
			</Sign.Shell>
		</Sign.Root>
	);
}
