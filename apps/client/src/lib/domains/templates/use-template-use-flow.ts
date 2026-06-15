import { useFilosignContext } from "@filosign/react";
import {
	useActiveOrgId,
	useCloneOrgTemplateToEnvelope,
} from "@filosign/react/orgs";
import {
	fetchCloneTemplatePayload,
	walletAccountAddress,
} from "@filosign/react/utils";
import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { toast } from "sonner";
import { TOASTS } from "@/src/lib/copy/toasts";
import { normalizeCreateForm } from "@/src/lib/domains/drafts";
import { hydrateCreateFormFromTemplateForCompose } from "@/src/lib/domains/templates/template-composer";
import { showAppErrorToast } from "@/src/lib/errors";
import { useStorePersist } from "@/src/lib/filosign/use-store";

export function useTemplateUseFlow() {
	const navigate = useNavigate();
	const { rpcQuery, wallet } = useFilosignContext();
	const activeOrgId = useActiveOrgId();
	const setCreateForm = useStorePersist((s) => s.setCreateForm);
	const cloneTemplate = useCloneOrgTemplateToEnvelope();

	const startUseTemplate = useCallback(
		(templateId: string, _templateName: string) => {
			if (!wallet?.account || !activeOrgId) return;

			void (async () => {
				try {
					await toast.promise(
						(async () => {
							const clone = await cloneTemplate.mutateAsync({ templateId });
							const walletAddress = walletAccountAddress(wallet.account);
							const myWrap = await rpcQuery.orgs.keys.wrapForMine.call({
								organizationId: activeOrgId,
							});
							const payload = await fetchCloneTemplatePayload({
								templateId: clone.templateId,
								headDekWrappedOmk: clone.headDekWrappedOmk,
								headOmkKemCiphertext: clone.headOmkKemCiphertext,
								snapshotJson: clone.snapshotJson,
								wallet: walletAddress,
								myOrgWrap: myWrap,
								documents: clone.documents,
							});
							const draft = await hydrateCreateFormFromTemplateForCompose({
								templateId: clone.templateId,
								snapshot: payload.snapshotJson,
								documents: payload.documents,
							});
							setCreateForm(normalizeCreateForm(draft));
							void navigate({ to: "/dashboard/envelope/create" });
							return TOASTS.templates.readyForUse;
						})(),
						{
							loading: TOASTS.templates.cloning,
							success: (message) => message,
							error: TOASTS.templates.cloneFailed.title,
						},
					);
				} catch (err) {
					showAppErrorToast(err);
				}
			})();
		},
		[
			activeOrgId,
			cloneTemplate,
			navigate,
			rpcQuery,
			setCreateForm,
			wallet?.account,
		],
	);

	return {
		startUseTemplate,
		clonePending: cloneTemplate.isPending,
	};
}
