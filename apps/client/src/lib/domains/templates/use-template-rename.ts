import { useRenameOrgTemplate } from "@filosign/react/orgs";
import { useCallback, useEffect, useState } from "react";
import { toastUser } from "@/src/lib/copy/toast";
import { TOASTS } from "@/src/lib/copy/toasts";

export function useTemplateRename(args: {
	templateId: string;
	templateName: string;
}) {
	const rename = useRenameOrgTemplate();
	const [localName, setLocalName] = useState<string | null>(null);
	const [renameOpen, setRenameOpen] = useState(false);

	useEffect(() => {
		setLocalName(null);
	}, [args.templateId, args.templateName]);

	const displayName = localName ?? args.templateName;

	const requestRename = useCallback(() => {
		setRenameOpen(true);
	}, []);

	const closeRename = useCallback((open: boolean) => {
		if (!open) setRenameOpen(false);
	}, []);

	const confirmRename = useCallback(
		async (name: string) => {
			const trimmed = name.trim();
			if (!trimmed) return;
			try {
				await rename.mutateAsync({
					templateId: args.templateId,
					name: trimmed,
				});
				setLocalName(trimmed);
				toastUser.success(TOASTS.templates.renamed);
				setRenameOpen(false);
			} catch {}
		},
		[args.templateId, rename],
	);

	return {
		displayName,
		renameOpen,
		closeRename,
		requestRename,
		confirmRename,
		renamePending: rename.isPending,
	};
}
