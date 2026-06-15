import { useFilosignContext } from "@filosign/react";
import { useActiveOrgId } from "@filosign/react/orgs";
import {
	cloneTemplateDocumentsToPlaintext,
	walletAccountAddress,
} from "@filosign/react/utils";
import { useEffect, useRef, useState } from "react";
import { hydrateCreateFormFromTemplateEditor } from "@/src/lib/domains/templates/template-composer";
import { showAppErrorToast } from "@/src/lib/errors";
import { useStorePersist } from "@/src/lib/filosign/use-store";

export type TemplateEditorLoadState =
	| "idle"
	| "loading"
	| "awaiting_crypto"
	| "error";

export function useTemplateEditorHydrate(args: {
	templateMode: "create" | "edit" | undefined;
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
		if (mode !== "edit" || !templateId) {
			setLoadState("idle");
			return;
		}

		const hydrateKey = `${mode}:${templateId}`;
		if (lastHydrateRef.current === hydrateKey) {
			setLoadState("idle");
			return;
		}

		const existing = useStorePersist.getState().createForm;
		if (existing?.documents.length) {
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

				const documents = await cloneTemplateDocumentsToPlaintext({
					templateId,
					headDekWrappedOmk: templateRow.template.headDekWrappedOmk,
					headOmkKemCiphertext: templateRow.template.headOmkKemCiphertext,
					wallet: walletAddress,
					myOrgWrap: myWrap,
					documents: templateRow.documents.flatMap((doc) =>
						doc.downloadUrl
							? [
									{
										docId: doc.docId,
										name: doc.name,
										mimeType: doc.mimeType,
										downloadUrl: doc.downloadUrl,
									},
								]
							: [],
					),
				});

				const draft = await hydrateCreateFormFromTemplateEditor({
					snapshot: templateRow.template.snapshotJson,
					documents,
				});

				if (cancelled) return;
				setCreateForm(draft);
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
