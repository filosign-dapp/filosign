import { PlusIcon } from "@phosphor-icons/react";
import { Button } from "@/src/lib/components/ui/button";
import { DisabledTooltip } from "@/src/lib/components/ui/disabled-tooltip";

type Props = {
	canManage: boolean;
	alreadyInstalledInWorkspace: boolean;
	onAddToWorkspace: () => void;
	addPending: boolean;
};

function resolveAddToWorkspaceDisabledReason(args: {
	canManage: boolean;
	alreadyInstalledInWorkspace: boolean;
}): string | null {
	if (!args.canManage) {
		return "Only workspace admins can add catalog templates.";
	}
	if (args.alreadyInstalledInWorkspace) {
		return "This catalog version is already in your workspace.";
	}
	return null;
}

export function CatalogPreviewActions({
	onAddToWorkspace,
	addPending,
	canManage,
	alreadyInstalledInWorkspace,
}: Props) {
	const addBlocked = !canManage || alreadyInstalledInWorkspace;
	const disabledReason = resolveAddToWorkspaceDisabledReason({
		canManage,
		alreadyInstalledInWorkspace,
	});

	return (
		<DisabledTooltip
			disabled={addBlocked}
			reason={disabledReason}
			side="bottom"
		>
			<Button
				type="button"
				variant="primary"
				size="lg"
				className="gap-2"
				disabled={addBlocked || addPending}
				isLoading={addPending}
				onClick={onAddToWorkspace}
			>
				<PlusIcon className="size-4" weight="bold" />
				<span className="hidden sm:inline">Add to workspace</span>
			</Button>
		</DisabledTooltip>
	);
}
