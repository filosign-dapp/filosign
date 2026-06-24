import { useFilosignContext } from "@filosign/react";
import { useSaveOrgTemplateDeps } from "@filosign/react/orgs";
import {
	saveOrgTemplateCreate,
	saveOrgTemplateUpdate,
} from "@filosign/react/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toastUser } from "@/src/lib/copy/toast";
import { TOASTS } from "@/src/lib/copy/toasts";
import { buildTemplateSaveInput } from "@/src/lib/domains/templates/utils/save-input";
import { showAppErrorToast } from "@/src/lib/errors";

type SaveTemplateArgs = {
	createForm: Parameters<typeof buildTemplateSaveInput>[0]["createForm"];
	templateId: string;
	templateName: string;
	organizationId: string;
	orgEncryptionPublicKey: `0x${string}`;
	mode: "create" | "edit";
};

export function useTemplateEditorSave() {
	const { rpcQuery } = useFilosignContext();
	const queryClient = useQueryClient();
	const deps = useSaveOrgTemplateDeps();
	const [saving, setSaving] = useState(false);

	const saveTemplate = useCallback(
		async (args: SaveTemplateArgs) => {
			if (!deps) {
				throw new Error("Sign in before saving a template.");
			}

			setSaving(true);
			try {
				const saveInput = await buildTemplateSaveInput(args);

				if (args.mode === "create") {
					await saveOrgTemplateCreate(deps, saveInput);
					toastUser.success(TOASTS.templates.created);
				} else {
					await saveOrgTemplateUpdate(deps, saveInput);
					toastUser.success(TOASTS.templates.saved);
				}

				await queryClient.invalidateQueries({
					queryKey: rpcQuery.orgs.key(),
				});
			} catch (err) {
				showAppErrorToast(err);
				throw err;
			} finally {
				setSaving(false);
			}
		},
		[deps, queryClient, rpcQuery],
	);

	return { saveTemplate, saving };
}
