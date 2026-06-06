import {
	useDeleteUserSignature,
	useSetDefaultSignature,
	useUserProfile,
	useUserSignatures,
} from "@filosign/react/users";
import type {
	UserSignatureArtifact,
	UserSignatureRole,
} from "@filosign/shared";
import {
	PencilSimpleIcon,
	SealCheckIcon,
	SignatureIcon,
	TrashIcon,
} from "@phosphor-icons/react";
import { SignatureArtifactPreview } from "@/src/lib/domains/signatures/preview";
import "@/src/lib/domains/signatures/signature-fonts.css";
import { Link } from "@tanstack/react-router";
import { AppEmptyState } from "@/src/lib/components/app/empty-state";
import { Button } from "@/src/lib/components/ui/button";
import { DocsLink } from "@/src/lib/docs/docs-link";
import { DOCS_LINKS } from "@/src/lib/docs/links";
import { cn } from "@/src/lib/utils";
import { ProfileSection } from "./profile-section";

function SignatureCard(props: {
	artifact: UserSignatureArtifact;
	isDefault: boolean;
	onSetDefault: (id: string, role: UserSignatureRole) => void;
	onDelete: (id: string) => void;
	busy: boolean;
}) {
	const roleLabel = props.artifact.role === "initial" ? "Initial" : "Signature";
	const kindLabel =
		props.artifact.kind === "typed"
			? "Typed"
			: props.artifact.kind === "drawn"
				? "Drawn"
				: "Uploaded";

	return (
		<div className="space-y-3 rounded-lg border border-border/70 bg-background/60 p-3">
			<div className="flex items-center justify-between gap-2">
				<div className="text-xs text-muted-foreground">
					{roleLabel} · {kindLabel}
				</div>
				{props.isDefault ? (
					<span className="inline-flex items-center gap-1 text-[11px] text-emerald-700">
						<SealCheckIcon className="size-3.5" />
						Default
					</span>
				) : null}
			</div>
			<div
				className={cn(
					"flex items-center justify-center rounded-md border border-border/50 bg-background p-2",
					props.artifact.role === "initial" ? "aspect-80/28" : "aspect-200/28",
				)}
			>
				<SignatureArtifactPreview
					artifact={props.artifact}
					alt={roleLabel}
					imgClassName="h-full w-full"
				/>
			</div>
			<div className="flex items-center justify-end gap-2">
				<Button
					variant="outline"
					size="sm"
					disabled={props.isDefault || props.busy}
					onClick={() =>
						props.onSetDefault(props.artifact.id, props.artifact.role)
					}
				>
					<PencilSimpleIcon className="size-3.5" />
					Set default
				</Button>
				<Button
					variant="outline"
					size="sm"
					className="text-destructive hover:text-destructive"
					disabled={props.busy}
					onClick={() => props.onDelete(props.artifact.id)}
				>
					<TrashIcon className="size-3.5" />
					Delete
				</Button>
			</div>
		</div>
	);
}

export function SignatureLibrarySection() {
	const { data: profile } = useUserProfile();
	const { data: signaturesData } = useUserSignatures();
	const setDefault = useSetDefaultSignature();
	const deleteSignature = useDeleteUserSignature();
	const signatures = signaturesData?.signatures ?? [];

	return (
		<ProfileSection
			icon={<SignatureIcon className="size-4" aria-hidden="true" />}
			title="Signature library"
			description="Manage saved signatures and initials used for field auto-fill."
		>
			<DocsLink href={DOCS_LINKS.signatureLibrary()} className="mb-4">
				Signature library guide
			</DocsLink>
			{signatures.length === 0 ? (
				<AppEmptyState
					preset="section"
					variant="outline"
					icon={SignatureIcon}
					title="No signatures saved yet"
					description="Create a typed, drawn, or uploaded signature for field auto-fill."
				>
					<Button
						type="button"
						variant="secondary"
						size="sm"
						render={<Link to="/dashboard/signature/create" />}
					>
						Create signature
					</Button>
				</AppEmptyState>
			) : (
				<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
					{signatures.map((artifact) => {
						const isDefault =
							artifact.role === "signature"
								? artifact.id === profile?.defaultSignatureId
								: artifact.id === profile?.defaultInitialId;
						return (
							<SignatureCard
								key={artifact.id}
								artifact={artifact}
								isDefault={isDefault}
								busy={setDefault.isPending || deleteSignature.isPending}
								onSetDefault={(id, role) => setDefault.mutate({ id, role })}
								onDelete={(id) => deleteSignature.mutate({ id })}
							/>
						);
					})}
				</div>
			)}
		</ProfileSection>
	);
}
