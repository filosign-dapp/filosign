import type { FilosignRpcQueryUtils } from "@filosign/react";
import type { UserProfile } from "@filosign/react/users";
import type {
	FieldCompletionMap,
	UserSignatureArtifact,
} from "@filosign/shared";
import { defaultPlacementLayout, zPlacementManifest } from "@filosign/shared";
import { resolvePlacementFieldCompletion } from "@/src/routes/dashboard/document/sign/-lib/utils/resolve-placement-field-completion";

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

	const layout = defaultPlacementLayout();
	const fieldCompletions: FieldCompletionMap = {};
	const completedFieldIds: string[] = [];

	for (const field of myFields) {
		const completion = await resolvePlacementFieldCompletion({
			field,
			defaultArtifacts,
			profile: args.selfProfile,
			layout,
			rpcQuery: args.rpcQuery,
			signatures: args.signatures,
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
