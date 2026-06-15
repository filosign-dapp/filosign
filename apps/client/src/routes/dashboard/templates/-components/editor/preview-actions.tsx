import { useActiveOrganization } from "@filosign/react/orgs";
import { PencilSimpleIcon, PlayIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/src/lib/components/ui/button";
import { canManageTemplates } from "@/src/lib/domains/templates/template-composer";

type Props = {
	templateId: string;
	onUseTemplate: () => void;
	usePending?: boolean;
};

export function TemplatePreviewActions({
	templateId,
	onUseTemplate,
	usePending = false,
}: Props) {
	const activeOrg = useActiveOrganization();
	const canManage = canManageTemplates(activeOrg?.role);

	return (
		<div className="flex items-center gap-2">
			{canManage ? (
				<Button
					type="button"
					variant="outline"
					size="lg"
					className="gap-2"
					render={
						<Link
							to="/dashboard/templates/$templateId/edit"
							params={{ templateId }}
							className="inline-flex items-center gap-2"
						/>
					}
				>
					<PencilSimpleIcon className="size-4" />
					<span className="hidden sm:inline">Edit template</span>
				</Button>
			) : null}
			<Button
				type="button"
				variant="primary"
				size="lg"
				className="gap-2"
				disabled={usePending}
				isLoading={usePending}
				onClick={onUseTemplate}
			>
				<PlayIcon className="size-4" weight="fill" />
				<span className="hidden sm:inline">Use template</span>
			</Button>
		</div>
	);
}
