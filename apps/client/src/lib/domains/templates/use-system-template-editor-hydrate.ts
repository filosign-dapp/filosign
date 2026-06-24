import { useFilosignContext } from "@filosign/react";
import { sha256PlaintextHex, zTemplateSnapshot } from "@filosign/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { resolveCreateFormSnapshotDigest } from "@/src/lib/domains/drafts";
import { hydrateCreateFormFromTemplateEditor } from "@/src/lib/domains/templates/template-composer";
import { showAppErrorToast } from "@/src/lib/errors";
import { useStorePersist } from "@/src/lib/filosign/use-store";

export type SystemTemplateEditorLoadState = "idle" | "loading" | "error";

export function useSystemTemplateEditorHydrate(args: {
	mode: "system-edit" | undefined;
	systemTemplateId: string | undefined;
}) {
	const { rpcQuery } = useFilosignContext();
	const queryClient = useQueryClient();
	const setCreateForm = useStorePersist((s) => s.setCreateForm);
	const [loadState, setLoadState] = useState<SystemTemplateEditorLoadState>(
		() => (args.mode === "system-edit" ? "loading" : "idle"),
	);
	const lastHydrateRef = useRef<string | null>(null);

	useEffect(() => {
		const systemTemplateId = args.systemTemplateId?.trim();
		if (args.mode !== "system-edit" || !systemTemplateId) {
			setLoadState("idle");
			return;
		}

		const hydrateKey = `system-edit:${systemTemplateId}`;
		if (lastHydrateRef.current === hydrateKey) {
			setLoadState("idle");
			return;
		}

		const existing = useStorePersist.getState().createForm;
		if (
			existing?.documents.length &&
			existing.templateContext?.systemTemplateId === systemTemplateId &&
			existing.templateContext.mode === "system-edit"
		) {
			lastHydrateRef.current = hydrateKey;
			setLoadState("idle");
			return;
		}

		let cancelled = false;
		setLoadState("loading");

		void (async () => {
			try {
				const templateRow = await queryClient.fetchQuery(
					rpcQuery.platformAdmin.systemTemplates.get.queryOptions({
						input: { systemTemplateId },
					}),
				);

				const resolvedDocuments = await Promise.all(
					templateRow.documents.flatMap((doc) => {
						const downloadUrl = doc.downloadUrl;
						if (!downloadUrl) return [];
						return [
							(async () => {
								const res = await fetch(downloadUrl);
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
						];
					}),
				);

				const draft = await hydrateCreateFormFromTemplateEditor({
					snapshot: zTemplateSnapshot.parse(templateRow.template.snapshotJson),
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
						mode: "system-edit" as const,
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
	}, [args.mode, args.systemTemplateId, queryClient, rpcQuery, setCreateForm]);

	return { systemTemplateEditorLoadState: loadState };
}
