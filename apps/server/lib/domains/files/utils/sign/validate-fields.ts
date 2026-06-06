import { throwAppError } from "@filosign/errors/server";
import {
	completionsMerkleRootV1,
	type FieldCompletionMap,
	type PlacementManifest,
	requiredFieldIdsForRecipientEmail,
} from "@filosign/shared";
import z from "zod";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";

export function validateCompletedFieldIdsForSigner(args: {
	manifest: PlacementManifest;
	signerEmail: string;
	completedFieldIds: string[];
}): string[] {
	const assignedForSigner = args.manifest.fields.filter(
		(f) => f.assignedRecipientEmail === args.signerEmail,
	);
	const allowedIds = new Set(assignedForSigner.map((f) => f.id));
	const requiredIds = requiredFieldIdsForRecipientEmail(
		args.manifest,
		args.signerEmail,
	);

	const fieldIds = args.completedFieldIds;
	const completedSet = new Set(fieldIds);
	for (const id of fieldIds) {
		if (!allowedIds.has(id)) {
			throwZodBadRequest(
				new z.ZodError([
					{
						code: "custom",
						message: "completedFieldIds must match manifest fields for signer",
						path: ["completedFieldIds"],
					},
				]),
			);
		}
	}
	for (const req of requiredIds) {
		if (!completedSet.has(req)) {
			throwAppError("SIGNING.PLACEMENT_INCOMPLETE");
		}
	}

	if (fieldIds.length === 0) {
		throwZodBadRequest(
			new z.ZodError([
				{
					code: "custom",
					message: "No fields to complete for this signer",
					path: ["completedFieldIds"],
				},
			]),
		);
	}

	return [...new Set(fieldIds)].sort((a, b) => a.localeCompare(b));
}

export function computeStoredCompletionsRoot(args: {
	completedFieldIdsStored: string[];
	placementCommitment: `0x${string}`;
	pieceCid: string;
	signerWallet: `0x${string}`;
}): `0x${string}` {
	try {
		return completionsMerkleRootV1({
			fieldIds: args.completedFieldIdsStored,
			placementCommitment: args.placementCommitment,
			pieceCid: args.pieceCid,
			signer: args.signerWallet,
		});
	} catch {
		throwZodBadRequest(
			new z.ZodError([
				{
					code: "custom",
					message: "Could not compute completions root",
					path: ["completedFieldIds"],
				},
			]),
		);
	}
}

export type AssignedFieldsContext = {
	assignedForSigner: PlacementManifest["fields"];
	completedFieldIdsStored: string[];
};

export function buildAssignedFieldsContext(args: {
	manifest: PlacementManifest;
	signerEmail: string;
	completedFieldIds: string[];
}): AssignedFieldsContext {
	const completedFieldIdsStored = validateCompletedFieldIdsForSigner(args);
	const assignedForSigner = args.manifest.fields.filter(
		(f) => f.assignedRecipientEmail === args.signerEmail,
	);
	return { assignedForSigner, completedFieldIdsStored };
}

export type { FieldCompletionMap };
