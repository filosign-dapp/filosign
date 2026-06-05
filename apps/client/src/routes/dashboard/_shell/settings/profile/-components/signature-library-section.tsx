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
import { Button } from "@/src/lib/components/ui/button";
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
		<div className="rounded-lg border border-border/70 bg-background/60 p-3 space-y-3">
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
					"rounded-md border border-border/50 bg-white p-2",
					props.artifact.role === "initial" ? "aspect-80/28" : "aspect-200/28",
				)}
			>
				{props.artifact.previewUrl ? (
					<img
						src={props.artifact.previewUrl}
						alt={roleLabel}
						className="h-full w-full object-contain"
					/>
				) : (
					<div className="flex h-full items-center justify-center text-xs text-muted-foreground">
						Preview unavailable
					</div>
				)}
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
			{signatures.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					No signatures saved yet. Create one from the signature setup flow.
				</p>
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
