import { useInstallCatalogTemplate } from "@filosign/react/catalog";
import { useGetOrgTemplate } from "@filosign/react/orgs";
import { resolveCatalogInstallName } from "@filosign/shared";
import { ArrowClockwiseIcon } from "@phosphor-icons/react";
import { Button } from "@/src/lib/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/src/lib/components/ui/tooltip";
import { toastUser } from "@/src/lib/copy/toast";
import { TOASTS } from "@/src/lib/copy/toasts";
import { showAppErrorToast } from "@/src/lib/errors";

type Props = {
	templateId: string;
	canManage: boolean;
};

export function OrgTemplateCatalogUpdate({ templateId, canManage }: Props) {
	const { data, isLoading } = useGetOrgTemplate(templateId);
	const { installCatalogTemplateToWorkspace, isInstalling } =
		useInstallCatalogTemplate();

	const catalogUpdate = data?.catalogUpdate;
	if (isLoading || !catalogUpdate?.newerVersionAvailable || !canManage) {
		return null;
	}

	const currentLabel = catalogUpdate.currentCatalogVersionLabel;
	if (!currentLabel) return null;

	const handleInstall = async () => {
		if (!data?.template) return;
		try {
			await installCatalogTemplateToWorkspace({
				systemTemplateId: catalogUpdate.systemTemplateId,
				pendingKey: templateId,
				name: resolveCatalogInstallName({
					name: data.template.name,
					catalogVersionLabel: currentLabel,
					appendVersionLabel: true,
				}),
			});
			toastUser.success(TOASTS.templates.catalogInstalled);
		} catch (err) {
			showAppErrorToast(err);
		}
	};

	return (
		<div className="mb-6 space-y-3 rounded-md border border-border/50 p-3">
			<h3 className="text-sm font-medium text-foreground">Library update</h3>
			<p className="text-sm text-muted-foreground">
				Version {currentLabel} is available. You have{" "}
				{catalogUpdate.installedCatalogVersionLabel} installed.
			</p>
			<p className="text-xs text-muted-foreground">
				Install creates a new workspace copy. This template stays as-is.
			</p>
			<Tooltip>
				<TooltipTrigger delay={0} render={<span className="inline-flex" />}>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="gap-1.5"
						disabled={isInstalling(templateId)}
						isLoading={isInstalling(templateId)}
						onClick={() => void handleInstall()}
					>
						<ArrowClockwiseIcon className="size-4" aria-hidden />
						Install new version
					</Button>
				</TooltipTrigger>
				<TooltipContent side="bottom" sideOffset={8}>
					Creates a new workspace copy. Your current template stays.
				</TooltipContent>
			</Tooltip>
		</div>
	);
}
