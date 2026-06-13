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
import { Link } from "@tanstack/react-router";
import { AppEmptyState } from "@/src/lib/components/app/empty-state";
import { Badge } from "@/src/lib/components/ui/badge";
import { Button } from "@/src/lib/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/src/lib/components/ui/tooltip";
import { DocsLink } from "@/src/lib/docs/docs-link";
import { DOCS_LINKS } from "@/src/lib/docs/links";
import { SignatureArtifactPreview } from "@/src/lib/domains/signatures/preview";
import "@/src/lib/domains/signatures/signature-fonts.css";
import { cn } from "@/src/lib/utils";
import { ProfileSection } from "./profile-section";

function kindLabel(kind: UserSignatureArtifact["kind"]) {
	if (kind === "typed") return "Typed";
	if (kind === "drawn") return "Drawn";
	return "Uploaded";
}

function SignatureLibraryRow(props: {
	artifact: UserSignatureArtifact;
	isDefault: boolean;
	onSetDefault: (id: string, role: UserSignatureRole) => void;
	onDelete: (id: string) => void;
	busy: boolean;
}) {
	const isInitial = props.artifact.role === "initial";

	return (
		<li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
			<div
				className={cn(
					"flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/50 bg-background px-3",
					isInitial ? "h-10 w-28" : "h-12 w-44",
				)}
			>
				<SignatureArtifactPreview
					artifact={props.artifact}
					alt={isInitial ? "Initial" : "Signature"}
					imgClassName="max-h-full max-w-full object-contain"
				/>
			</div>

			<div className="min-w-0 flex-1 space-y-1">
				<div className="flex flex-wrap items-center gap-2">
					<p className="text-sm font-medium text-foreground">
						{kindLabel(props.artifact.kind)}
					</p>
					{props.isDefault ? (
						<Badge variant="secondary" className="gap-1 text-[10px]">
							<SealCheckIcon className="size-3" weight="fill" aria-hidden />
							Default
						</Badge>
					) : null}
				</div>
				<p className="text-xs text-muted-foreground">
					Used for {isInitial ? "initial fields" : "signature fields"} when you
					sign.
				</p>
			</div>

			<div className="flex shrink-0 items-center gap-1 self-end sm:self-center">
				{!props.isDefault ? (
					<Tooltip>
						<TooltipTrigger
							render={
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									disabled={props.busy}
									onClick={() =>
										props.onSetDefault(props.artifact.id, props.artifact.role)
									}
									aria-label="Set as default"
								/>
							}
						>
							<PencilSimpleIcon className="size-4" />
						</TooltipTrigger>
						<TooltipContent>Set as default</TooltipContent>
					</Tooltip>
				) : null}
				<Tooltip>
					<TooltipTrigger
						render={
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								className="text-destructive hover:text-destructive"
								disabled={props.busy}
								onClick={() => props.onDelete(props.artifact.id)}
								aria-label="Delete"
							/>
						}
					>
						<TrashIcon className="size-4" />
					</TooltipTrigger>
					<TooltipContent>Delete</TooltipContent>
				</Tooltip>
			</div>
		</li>
	);
}

function SignatureLibraryGroup(props: {
	title: string;
	description: string;
	artifacts: UserSignatureArtifact[];
	defaultId: string | null | undefined;
	onSetDefault: (id: string, role: UserSignatureRole) => void;
	onDelete: (id: string) => void;
	busy: boolean;
}) {
	if (props.artifacts.length === 0) return null;

	return (
		<div className="space-y-2">
			<div>
				<h3 className="text-sm font-medium text-foreground">{props.title}</h3>
				<p className="text-xs text-muted-foreground">{props.description}</p>
			</div>
			<ul className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/60 bg-background/40">
				{props.artifacts.map((artifact) => (
					<SignatureLibraryRow
						key={artifact.id}
						artifact={artifact}
						isDefault={artifact.id === props.defaultId}
						onSetDefault={props.onSetDefault}
						onDelete={props.onDelete}
						busy={props.busy}
					/>
				))}
			</ul>
		</div>
	);
}

export function SignatureLibrarySection() {
	const { data: profile } = useUserProfile();
	const { data: signaturesData } = useUserSignatures();
	const setDefault = useSetDefaultSignature();
	const deleteSignature = useDeleteUserSignature();
	const signatures = signaturesData?.signatures ?? [];
	const busy = setDefault.isPending || deleteSignature.isPending;

	const signatureArtifacts = signatures.filter((s) => s.role === "signature");
	const initialArtifacts = signatures.filter((s) => s.role === "initial");

	return (
		<ProfileSection
			icon={<SignatureIcon className="size-4" aria-hidden="true" />}
			title="Signature library"
			description="Manage saved signatures and initials used for field auto-fill."
			headerAside={
				<Button
					type="button"
					variant="outline"
					size="sm"
					render={<Link to="/dashboard/signature/create" />}
				>
					Add signature
				</Button>
			}
		>
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
				<div className="space-y-6">
					<SignatureLibraryGroup
						title="Signatures"
						description="Full signatures applied to signature fields."
						artifacts={signatureArtifacts}
						defaultId={profile?.defaultSignatureId}
						onSetDefault={(id, role) => setDefault.mutate({ id, role })}
						onDelete={(id) => deleteSignature.mutate({ id })}
						busy={busy}
					/>
					<SignatureLibraryGroup
						title="Initials"
						description="Short marks applied to initial fields."
						artifacts={initialArtifacts}
						defaultId={profile?.defaultInitialId}
						onSetDefault={(id, role) => setDefault.mutate({ id, role })}
						onDelete={(id) => deleteSignature.mutate({ id })}
						busy={busy}
					/>
				</div>
			)}

			<DocsLink href={DOCS_LINKS.signatureLibrary()} className="mt-4">
				Signature library guide
			</DocsLink>
		</ProfileSection>
	);
}
