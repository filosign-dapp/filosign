import { useFilosignContext } from "@filosign/react";
import { sha256PlaintextHex, zTemplateSnapshot } from "@filosign/shared";
import { useEffect, useRef, useState } from "react";
import { resolveCreateFormSnapshotDigest } from "@/src/lib/domains/drafts";
import { hydrateCreateFormFromTemplateEditor } from "@/src/lib/domains/templates/template-composer";
import { showAppErrorToast } from "@/src/lib/errors";
import { useStorePersist } from "@/src/lib/filosign/use-store";

export type CatalogTemplatePreviewLoadState = "idle" | "loading" | "error";

function matchesCatalogPreviewContext(
	existing: NonNullable<
		ReturnType<typeof useStorePersist.getState>["createForm"]
	>,
	systemTemplateId: string,
): boolean {
	return (
		existing.templateContext?.mode === "preview" &&
		existing.templateContext.systemTemplateId === systemTemplateId
	);
}

export function useCatalogTemplatePreviewHydrate(args: {
	systemTemplateId: string | undefined;
}) {
	const { rpcQuery } = useFilosignContext();
	const setCreateForm = useStorePersist((s) => s.setCreateForm);
	const [loadState, setLoadState] = useState<CatalogTemplatePreviewLoadState>(
		() => (args.systemTemplateId ? "loading" : "idle"),
	);
	const lastHydrateRef = useRef<string | null>(null);

	useEffect(() => {
		const systemTemplateId = args.systemTemplateId?.trim();
		if (!systemTemplateId) {
			setLoadState("idle");
			return;
		}

		const hydrateKey = `catalog-preview:${systemTemplateId}`;
		if (lastHydrateRef.current === hydrateKey) {
			setLoadState("idle");
			return;
		}

		const existing = useStorePersist.getState().createForm;
		if (
			existing?.documents.length &&
			matchesCatalogPreviewContext(existing, systemTemplateId)
		) {
			lastHydrateRef.current = hydrateKey;
			setLoadState("idle");
			return;
		}

		let cancelled = false;
		setLoadState("loading");

		void (async () => {
			try {
				const catalogRow = await rpcQuery.catalog.get.call({
					systemTemplateId,
				});

				const resolvedDocuments = await Promise.all(
					catalogRow.template.documents.flatMap((doc) =>
						doc.downloadUrl
							? [
									(async () => {
										const res = await fetch(doc.downloadUrl);
										if (!res.ok) {
											throw new Error(`Failed to load ${doc.name}`);
										}
										const bytes = new Uint8Array(await res.arrayBuffer());
										return {
											id: doc.docId,
											name: doc.name,
											size: doc.size,
											type: doc.mimeType,
											bytes,
											plaintextSha256: await sha256PlaintextHex(bytes),
										};
									})(),
								]
							: [],
					),
				);

				const draft = await hydrateCreateFormFromTemplateEditor({
					snapshot: zTemplateSnapshot.parse(catalogRow.template.snapshotJson),
					documents: resolvedDocuments.map((doc) => ({
						id: doc.id,
						name: doc.name,
						size: doc.size,
						type: doc.type,
						bytes: doc.bytes,
					})),
				});

				const hydrated = {
					...draft,
					documents: resolvedDocuments.map((doc) => ({
						id: doc.id,
						file: new File([doc.bytes], doc.name, { type: doc.type }),
						name: doc.name,
						size: doc.size,
						type: doc.type,
						plaintextSha256: doc.plaintextSha256,
					})),
					templateContext: {
						templateId: systemTemplateId,
						systemTemplateId,
						mode: "preview" as const,
					},
					templateUse: undefined,
				};
				hydrated.lastSavedSnapshotDigest =
					resolveCreateFormSnapshotDigest(hydrated);

				if (cancelled) return;
				setCreateForm(hydrated);
				lastHydrateRef.current = hydrateKey;
				setLoadState("idle");
			} catch (err) {
				if (cancelled) return;
				lastHydrateRef.current = null;
				setLoadState("error");
				showAppErrorToast(err);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [args.systemTemplateId, rpcQuery, setCreateForm]);

	return { catalogPreviewLoadState: loadState };
}
