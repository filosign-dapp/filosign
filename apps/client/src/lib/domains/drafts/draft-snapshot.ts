import type { DraftSnapshot } from "@filosign/shared";
import type {
	CreateForm,
	EnvelopeForm,
	SignatureField,
} from "@/src/lib/domains/files/envelope-form-types";

export function buildDraftSnapshotFromForm(args: {
	recipients: EnvelopeForm["recipients"];
	emailSubject: string;
	emailMessage: string;
	documents: { id: string; name: string; size: number; type: string }[];
	settlementDrafts: CreateForm["settlementDrafts"];
	signatureFields: SignatureField[];
	placementManifest: DraftSnapshot["placementManifest"];
}): DraftSnapshot {
	return {
		recipients: args.recipients,
		emailSubject: args.emailSubject,
		emailMessage: args.emailMessage,
		documents: args.documents,
		settlementDrafts: args.settlementDrafts ?? [],
		signatureFields: args.signatureFields,
		placementManifest: args.placementManifest,
	};
}
