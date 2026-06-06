import type { ComplianceBundle } from "@filosign/shared";
import type { CompliancePdfLine } from "../../compliance-pdf-types";
import {
	fieldPlacementStatusFromSignerRow,
	type signersByNormalizedRecipientEmail,
} from "../placement";

type SignersByRecipient = ReturnType<typeof signersByNormalizedRecipientEmail>;

export function buildPlacementRefLines(
	bundle: ComplianceBundle,
	signersByRecipient: SignersByRecipient,
): CompliancePdfLine[] {
	const placementRef: CompliancePdfLine[] = [
		{
			text: "This section lists the fields placed on the document and whether each field was signed, pending, or only saved as a draft when the report was exported.",
			textStyle: "lead",
		},
		{ text: "" },
		{
			text: "Fields on the document:",
			textStyle: "listHeading",
		},
		{ text: "" },
	];

	for (let i = 0; i < bundle.placementManifest.fields.length; i++) {
		const f = bundle.placementManifest.fields[i];
		const recipientKey = f.assignedRecipientEmail.trim().toLowerCase();
		const signerRow = signersByRecipient.get(recipientKey);
		const st = fieldPlacementStatusFromSignerRow(signerRow, f.id);

		const name = signerRow?.displayName?.trim();
		const email = signerRow?.email?.trim();

		const statusLabel =
			st === "signed" ? "SIGNED" : st === "draft" ? "DRAFT" : "PENDING";
		const reqLabel = f.required ? "required" : "optional";

		placementRef.push({
			text: `${i + 1}. ${f.id} (${f.type}, ${reqLabel}, ${statusLabel})`,
		});
		placementRef.push({
			text: `   Page ${f.pageIndex + 1} / Rect [x:${f.rect.x.toFixed(3)} y:${f.rect.y.toFixed(3)} w:${f.rect.width.toFixed(3)} h:${f.rect.height.toFixed(3)}]`,
		});

		const signerParts: string[] = [];
		if (name) signerParts.push(name);
		if (email) signerParts.push(email);
		signerParts.push(f.assignedRecipientEmail);
		placementRef.push({ text: `   -> ${signerParts.join(" | ")}` });

		if (i < bundle.placementManifest.fields.length - 1) {
			placementRef.push({ text: "" });
		}
	}

	return placementRef;
}

export function buildManifestLines(
	bundle: ComplianceBundle,
): CompliancePdfLine[] {
	const manifestJson = JSON.stringify(bundle.placementManifest, null, 2);
	const manifestLines: CompliancePdfLine[] = [
		{
			text: "Canonical JSON for the placement commitment. Independent verification recomputes the commitment from this exact serialization (see @filosign/shared).",
			textStyle: "lead",
		},
		{ text: "" },
		{
			text: "Full placement manifest JSON (canonical for placement commitment):",
			textStyle: "listHeading",
		},
		{ text: "" },
	];
	for (const line of manifestJson.split("\n")) {
		manifestLines.push({ text: line || " ", textStyle: "smallMuted" });
	}
	return manifestLines;
}
