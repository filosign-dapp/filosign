import { useFilosignContext } from "@filosign/react";
import { useActiveOrgId } from "@filosign/react/orgs";
import {
	cloneTemplateDocumentsToPlaintext,
	walletAccountAddress,
} from "@filosign/react/utils";
import { useEffect, useRef, useState } from "react";
import {
	loadDocumentBytes,
	resolveCreateFormSnapshotDigest,
} from "@/src/lib/domains/drafts";
import { hydrateCreateFormFromTemplateEditor } from "@/src/lib/domains/templates/template-composer";
import { showAppErrorToast } from "@/src/lib/errors";
import { useStorePersist } from "@/src/lib/filosign/use-store";

export type TemplateEditorLoadState =
	| "idle"
	| "loading"
	| "awaiting_crypto"
	| "error";

function matchesTemplateEditorContext(
	existing: NonNullable<
		ReturnType<typeof useStorePersist.getState>["createForm"]
	>,
	templateId: string,
	mode: "edit" | "preview",
): boolean {
	return (
		existing.templateContext?.templateId === templateId &&
		existing.templateContext.mode === mode
	);
}

export function useTemplateEditorHydrate(args: {
	templateMode: "edit" | "preview" | undefined;
	templateId: string | undefined;
	cryptoReady: boolean;
}) {
	const { rpcQuery, wallet } = useFilosignContext();
	const activeOrgId = useActiveOrgId();
	const setCreateForm = useStorePersist((s) => s.setCreateForm);
	const [loadState, setLoadState] = useState<TemplateEditorLoadState>("idle");
	const lastHydrateRef = useRef<string | null>(null);

	useEffect(() => {
		const mode = args.templateMode;
		const templateId = args.templateId?.trim();
		if (mode !== "edit" && mode !== "preview") {
			setLoadState("idle");
			return;
		}

		const hydrateKey = `${mode}:${templateId}`;
		if (!templateId) {
			setLoadState("idle");
			return;
		}
		if (lastHydrateRef.current === hydrateKey) {
			setLoadState("idle");
			return;
		}

		const existing = useStorePersist.getState().createForm;
		if (
			existing?.documents.length &&
			matchesTemplateEditorContext(existing, templateId, mode)
		) {
			lastHydrateRef.current = hydrateKey;
			setLoadState("idle");
			return;
		}

		if (!args.cryptoReady) {
			setLoadState("awaiting_crypto");
			return;
		}
		if (!wallet?.account || !activeOrgId) {
			setLoadState("error");
			return;
		}

		let cancelled = false;
		setLoadState("loading");

		void (async () => {
			try {
				const walletAddress = walletAccountAddress(wallet.account);
				const [templateRow, myWrap] = await Promise.all([
					rpcQuery.orgs.templates.get.call({ templateId }),
					rpcQuery.orgs.keys.wrapForMine.call({
						organizationId: activeOrgId,
					}),
				]);

				const serverDocs = templateRow.documents.flatMap((doc) =>
					doc.downloadUrl
						? [
								{
									docId: doc.docId,
									name: doc.name,
									mimeType: doc.mimeType,
									size: doc.size,
									downloadUrl: doc.downloadUrl,
									plaintextSha256: doc.plaintextSha256,
								},
							]
						: [],
				);

				const localDraftId =
					useStorePersist.getState().createForm?.draftId ?? null;

				const documents = await cloneTemplateDocumentsToPlaintext({
					templateId,
					headDekWrappedOmk: templateRow.template.headDekWrappedOmk,
					headOmkKemCiphertext: templateRow.template.headOmkKemCiphertext,
					wallet: walletAddress,
					myOrgWrap: myWrap,
					documents: serverDocs,
					loadLocalBytes: localDraftId
						? async (docId) => {
								const row = serverDocs.find((doc) => doc.docId === docId);
								if (!row) return null;
								try {
									return await loadDocumentBytes(localDraftId, {
										id: docId,
										name: row.name,
										size: row.size,
										type: row.mimeType,
									});
								} catch {
									return null;
								}
							}
						: undefined,
				});

				const draft = await hydrateCreateFormFromTemplateEditor({
					snapshot: templateRow.template.snapshotJson,
					documents,
				});

				const hydrated: typeof draft = {
					...draft,
					documents: draft.documents.map((doc) => {
						const row = documents.find((item) => item.id === doc.id);
						return row ? { ...doc, plaintextSha256: row.plaintextSha256 } : doc;
					}),
					templateContext: { templateId, mode },
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
	}, [
		activeOrgId,
		args.cryptoReady,
		args.templateId,
		args.templateMode,
		rpcQuery,
		setCreateForm,
		wallet?.account,
	]);

	return { templateEditorLoadState: loadState };
}
