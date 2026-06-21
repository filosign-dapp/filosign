import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { useFilosignContext } from "../../context/useFilosignContext";
import {
	createInstallCatalogTemplateDeps,
	installCatalogTemplate,
} from "../../lib/install-catalog-template/install-catalog-template";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import { useActiveOrganization } from "../orgs/useActiveOrganization";
import { useActiveOrgId } from "../orgs/useOrganizations";

export type InstallCatalogTemplateArgs = {
	systemTemplateId: string;
	name: string;
	templateId?: string;
	/** Defaults to systemTemplateId when omitted. */
	pendingKey?: string;
};

export function useInstallCatalogTemplate() {
	const { wallet } = useFilosignContext();
	const { rpc, rpcQuery, isAuthed } = useFilosignRpc();
	const activeOrgId = useActiveOrgId();
	const activeOrg = useActiveOrganization();
	const queryClient = useQueryClient();
	const [installingKey, setInstallingKey] = useState<string | null>(null);

	const deps = useMemo(() => {
		if (!wallet) return null;
		return createInstallCatalogTemplateDeps({ rpc, wallet });
	}, [rpc, wallet]);

	const mutation = useMutation({
		mutationFn: async (args: InstallCatalogTemplateArgs) => {
			if (!isAuthed) throw new Error("Not authenticated");
			if (!deps || !activeOrgId || !activeOrg?.encryptionPublicKey) {
				throw new Error("Connect your wallet and select a workspace first.");
			}

			const pendingKey = args.pendingKey ?? args.systemTemplateId;
			setInstallingKey(pendingKey);
			try {
				return await installCatalogTemplate(deps, {
					systemTemplateId: args.systemTemplateId,
					templateId: args.templateId ?? crypto.randomUUID(),
					organizationId: activeOrgId,
					orgEncryptionPublicKey: activeOrg.encryptionPublicKey,
					name: args.name,
				});
			} finally {
				setInstallingKey(null);
			}
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: rpcQuery.orgs.key() });
			await queryClient.invalidateQueries({
				queryKey: rpcQuery.catalog.key(),
			});
		},
	});

	const installCatalogTemplateToWorkspace = useCallback(
		(args: InstallCatalogTemplateArgs) => mutation.mutateAsync(args),
		[mutation],
	);

	const isInstalling = useCallback(
		(key: string) => installingKey === key,
		[installingKey],
	);

	return {
		installCatalogTemplateToWorkspace,
		installingKey,
		isInstalling,
		isPending: mutation.isPending,
	};
}
