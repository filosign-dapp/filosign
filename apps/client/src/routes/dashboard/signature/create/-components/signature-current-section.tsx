import { useUserProfile, useUserSignatures } from "@filosign/react/users";
import {
	resolveDefaultSignatureArtifact,
	type UserSignatureArtifact,
} from "@filosign/shared";
import { Link } from "@tanstack/react-router";
import { SignatureArtifactPreview } from "@/src/lib/domains/signatures/preview";
import { SignaturePreviewShell } from "@/src/lib/domains/signatures/preview-shell";
import { useSignatureCreate } from "@/src/routes/dashboard/signature/create/-lib/context/context";

function CurrentSignaturePreview({
	artifact,
	label,
}: {
	artifact: UserSignatureArtifact | undefined;
	label: string;
}) {
	const role = label === "Initials" ? "initial" : "signature";

	return (
		<div className="flex items-center gap-2.5">
			<span className="w-16 shrink-0 text-xs text-muted-foreground">
				{label}
			</span>
			<SignaturePreviewShell signatureRole={role}>
				{artifact ? (
					<SignatureArtifactPreview
						artifact={artifact}
						alt={label}
						inPreviewShell
					/>
				) : (
					<span className="text-xs text-muted-foreground">Not set</span>
				)}
			</SignaturePreviewShell>
		</div>
	);
}

export function SignatureCurrentSection() {
	const { fullName, hasSignableName, profileSettingsHref } =
		useSignatureCreate();
	const { data: profile } = useUserProfile();
	const { data: signaturesData, isLoading } = useUserSignatures();
	const signatures = signaturesData?.signatures ?? [];

	const defaultSignature = resolveDefaultSignatureArtifact(
		signatures,
		"signature",
		profile?.defaultSignatureId,
	);
	const defaultInitial = resolveDefaultSignatureArtifact(
		signatures,
		"initial",
		profile?.defaultInitialId,
	);

	const hasAnySaved = signatures.length > 0;

	return (
		<div className="w-full space-y-2">
			<section className="w-full rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="min-w-0 space-y-0.5">
						<h4 className="text-sm font-medium text-foreground">
							Current signature
						</h4>
						<p className="text-xs text-muted-foreground">
							What Filosign uses when you sign documents today.
						</p>
					</div>

					{isLoading ? (
						<p className="text-xs text-muted-foreground">Loading…</p>
					) : !hasAnySaved ? (
						<p className="text-xs text-muted-foreground">None saved yet</p>
					) : (
						<div className="flex flex-wrap items-center gap-x-8 gap-y-2">
							<CurrentSignaturePreview
								artifact={defaultSignature}
								label="Signature"
							/>
							<CurrentSignaturePreview
								artifact={defaultInitial}
								label="Initials"
							/>
						</div>
					)}
				</div>
			</section>

			<p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
				{hasSignableName ? (
					<>
						<span>
							Signing as{" "}
							<span className="font-medium text-foreground">{fullName}</span>
						</span>
						<span aria-hidden className="text-border">
							·
						</span>
						<Link
							to={profileSettingsHref}
							className="underline-offset-4 hover:text-foreground hover:underline"
						>
							Change
						</Link>
					</>
				) : (
					<>
						<span>
							Add your first name in profile settings to choose a signature
							style.
						</span>
						<Link
							to={profileSettingsHref}
							className="underline-offset-4 hover:text-foreground hover:underline"
						>
							Profile settings
						</Link>
					</>
				)}
			</p>
		</div>
	);
}
