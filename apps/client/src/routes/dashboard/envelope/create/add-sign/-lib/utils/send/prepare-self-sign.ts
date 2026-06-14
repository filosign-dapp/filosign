import type { FilosignRpcQueryUtils } from "@filosign/react";
import type { UserProfile } from "@filosign/react/users";
import { ensureDefaultTypedSignatureArtifact } from "@filosign/react/users";
import type {
	FieldCompletionMap,
	PlacementField,
	UserSignatureArtifact,
} from "@filosign/shared";
import {
	buildVisualCompletionFromArtifact,
	zPlacementManifest,
} from "@filosign/shared";
import { buildSyncFieldCompletion } from "@/src/routes/dashboard/document/sign/-lib/utils/field-completion-builders";

export async function prepareSelfSignCompletions(args: {
	pieceCid: string;
	selfFieldIds: string[];
	selfProfile: UserProfile;
	signatures: UserSignatureArtifact[];
	rpcQuery: FilosignRpcQueryUtils;
}): Promise<{
	completedFieldIds: string[];
	fieldCompletions: FieldCompletionMap;
}> {
	const detail = await args.rpcQuery.files.piece.detail.call({
		pieceCid: args.pieceCid,
	});
	const manifestRaw = detail.placementManifest;
	if (manifestRaw == null) {
		throw new Error(
			"Document manifest unavailable; try opening the document from your dashboard.",
		);
	}

	const manifest = zPlacementManifest.parse(manifestRaw);
	const selfFieldIdSet = new Set(args.selfFieldIds);
	const myFields = manifest.fields.filter((field) =>
		selfFieldIdSet.has(field.id),
	);

	if (myFields.length === 0) {
		throw new Error("No assigned fields found for self-signing.");
	}

	const defaultArtifacts = {
		signature:
			args.signatures.find(
				(row) => row.id === args.selfProfile.defaultSignatureId,
			) ?? null,
		initial:
			args.signatures.find(
				(row) => row.id === args.selfProfile.defaultInitialId,
			) ?? null,
	};

	const fieldCompletions: FieldCompletionMap = {};
	const completedFieldIds: string[] = [];

	for (const field of myFields) {
		const completion = await resolveSelfFieldCompletion({
			field,
			defaultArtifacts,
			selfProfile: args.selfProfile,
			signatures: args.signatures,
			rpcQuery: args.rpcQuery,
		});
		if (!completion) {
			if (field.required) {
				throw new Error(
					field.type === "signature" || field.type === "initial"
						? "Add a default signature or initial in your profile before self-signing at send."
						: `Complete the required ${field.type} field before self-signing at send.`,
				);
			}
			continue;
		}

		fieldCompletions[field.id] = completion;
		completedFieldIds.push(field.id);
	}

	if (completedFieldIds.length === 0) {
		throw new Error("No field values could be prepared for self-signing.");
	}

	return { completedFieldIds, fieldCompletions };
}

async function resolveSelfFieldCompletion(args: {
	field: PlacementField;
	defaultArtifacts: {
		signature: UserSignatureArtifact | null;
		initial: UserSignatureArtifact | null;
	};
	selfProfile: UserProfile;
	signatures: UserSignatureArtifact[];
	rpcQuery: FilosignRpcQueryUtils;
}) {
	const syncCompletion = buildSyncFieldCompletion(
		args.field,
		args.defaultArtifacts,
		args.selfProfile,
	);
	if (syncCompletion) {
		return syncCompletion;
	}

	if (args.field.type !== "signature" && args.field.type !== "initial") {
		return null;
	}

	const role = args.field.type;
	const ensured = await ensureDefaultTypedSignatureArtifact({
		rpcQuery: args.rpcQuery,
		profile: {
			firstName: args.selfProfile.firstName,
			lastName: args.selfProfile.lastName,
			email: args.selfProfile.email,
			username: args.selfProfile.username,
			defaultSignatureId: args.selfProfile.defaultSignatureId,
			defaultInitialId: args.selfProfile.defaultInitialId,
		},
		role,
		signatures: args.signatures,
	});

	return buildVisualCompletionFromArtifact(args.field, ensured);
}
