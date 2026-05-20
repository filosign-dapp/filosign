import {
	ArrowLeftIcon,
	CheckCircleIcon,
	FileTextIcon,
	SpinnerIcon,
} from "@phosphor-icons/react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Button } from "@/src/lib/components/ui/button";
import { InlineLoader } from "@/src/lib/components/ui/inline-loader";
import { useSignDocument } from "@/src/routes/dashboard/document/sign/-lib/hooks/use-controller";
import { Sign } from "./ui";

type SignDocumentPageProps = {
	/** Set when rendered from invite unlock page after keys are available. */
	skipInviteUnlock?: boolean;
};

export function SignDocumentPage({
	skipInviteUnlock: _skip,
}: SignDocumentPageProps = {}) {
	const navigate = useNavigate();
	const search = useSearch({ from: "/dashboard/document/sign/" });
	const pieceCid = search.pieceCid?.trim() ?? "";

	const sign = useSignDocument();

	const { file, filePending, fileError, acknowledgeFile } = sign.fileQuery;
	const { handleAcknowledge } = sign.acknowledge;

	const toDashboard = () => navigate({ to: "/dashboard" });

	if (filePending) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4">
				<InlineLoader size="lg" />
				<p className="text-sm text-muted-foreground">Preparing document…</p>
			</div>
		);
	}

	if (fileError || !file) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen bg-background p-8">
				<FileTextIcon className="h-16 w-16 text-muted-foreground mb-4" />
				<h2 className="text-xl font-semibold mb-2">File Not Found</h2>
				<p className="text-muted-foreground mb-4">
					The document you're trying to sign could not be found.
				</p>
				{fileError && (
					<p className="text-xs text-destructive mb-4 max-w-md text-center">
						Error:{" "}
						{fileError instanceof Error ? fileError.message : "Unknown error"}
					</p>
				)}
				<Button onClick={toDashboard}>
					<ArrowLeftIcon className="h-4 w-4 mr-2" />
					Back to Dashboard
				</Button>
			</div>
		);
	}

	if (
		file &&
		!(
			(file.kemCiphertext && file.encryptedEncryptionKey) ||
			(file.organizationId &&
				file.orgKemCiphertext &&
				file.orgEncryptedEncryptionKey)
		)
	) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen bg-background p-8">
				<FileTextIcon className="h-16 w-16 text-amber-500 mb-4" />
				<h2 className="text-xl font-semibold mb-2">Accept File?</h2>
				<p className="text-muted-foreground mb-4 text-center max-w-md">
					This document must be acknowledged before it can be viewed or signed.
				</p>
				<div className="flex items-center gap-3">
					<Button
						onClick={() => void handleAcknowledge()}
						disabled={acknowledgeFile.isPending}
						variant="primary"
					>
						{acknowledgeFile.isPending ? (
							<>
								<SpinnerIcon className="size-5 animate-spin" />
								Accepting
							</>
						) : (
							<>
								<CheckCircleIcon className="size-5" />
								Accept File
							</>
						)}
					</Button>
				</div>
			</div>
		);
	}

	if (!pieceCid || !file) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen p-8">
				<FileTextIcon className="h-16 w-16 text-muted-foreground mb-4" />
				<h2 className="text-xl font-semibold mb-2">Invalid Request</h2>
				<p className="text-muted-foreground mb-4">
					No document specified for signing.
				</p>
				<Button onClick={toDashboard}>
					<ArrowLeftIcon className="h-4 w-4 mr-2" />
					Back to Dashboard
				</Button>
			</div>
		);
	}

	return (
		<Sign.Root value={{ sign, pieceCid, file }}>
			<Sign.Shell>
				<Sign.Dialogs />
			</Sign.Shell>
		</Sign.Root>
	);
}
