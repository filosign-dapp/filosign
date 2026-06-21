import { useFilosignContext } from "@filosign/react";
import {
	createSaveSystemTemplateDeps,
	saveSystemTemplateCreate,
	saveSystemTemplateUpdate,
} from "@filosign/react/utils";
import type { SystemTemplateMeta } from "@filosign/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { toastUser } from "@/src/lib/copy/toast";
import { TOASTS } from "@/src/lib/copy/toasts";
import { buildSystemTemplateSaveInput } from "@/src/lib/domains/templates/utils/system-save-input";
import { showAppErrorToast } from "@/src/lib/errors";

type SaveSystemTemplateArgs = {
	createForm: Parameters<typeof buildSystemTemplateSaveInput>[0]["createForm"];
	systemTemplateId: string;
	templateName: string;
	meta: SystemTemplateMeta;
	mode: "system-create" | "system-edit";
};

export function useSystemTemplateEditorSave() {
	const { rpc, rpcQuery } = useFilosignContext();
	const queryClient = useQueryClient();
	const deps = useMemo(() => createSaveSystemTemplateDeps({ rpc }), [rpc]);
	const [saving, setSaving] = useState(false);

	const saveSystemTemplate = useCallback(
		async (args: SaveSystemTemplateArgs) => {
			setSaving(true);
			try {
				const baseInput = await buildSystemTemplateSaveInput({
					createForm: args.createForm,
					systemTemplateId: args.systemTemplateId,
					templateName: args.templateName,
				});

				const input = {
					...baseInput,
					meta: args.meta,
				};

				if (args.mode === "system-create") {
					await saveSystemTemplateCreate(deps, input);
					toastUser.success(TOASTS.templates.created);
				} else {
					await saveSystemTemplateUpdate(deps, input);
					toastUser.success(TOASTS.templates.saved);
				}

				await queryClient.invalidateQueries({
					queryKey: rpcQuery.platformAdmin.systemTemplates.list.queryKey(),
				});
			} catch (err) {
				showAppErrorToast(err);
				throw err;
			} finally {
				setSaving(false);
			}
		},
		[deps, queryClient, rpcQuery.platformAdmin.systemTemplates.list],
	);

	return { saveSystemTemplate, saving };
}
