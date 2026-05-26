import { createContext, useContext } from "react";
import type { WorkspaceSettingsController } from "@/src/routes/dashboard/_shell/settings/workspace/-lib/hooks/use-workspace-controller";

const WorkspaceSettingsContext =
	createContext<WorkspaceSettingsController | null>(null);

export function WorkspaceSettingsProvider({
	value,
	children,
}: {
	value: WorkspaceSettingsController;
	children: React.ReactNode;
}) {
	return (
		<WorkspaceSettingsContext.Provider value={value}>
			{children}
		</WorkspaceSettingsContext.Provider>
	);
}

export function useWorkspaceSettings(): WorkspaceSettingsController {
	const context = useContext(WorkspaceSettingsContext);
	if (!context) {
		throw new Error(
			"useWorkspaceSettings must be used within WorkspaceSettingsProvider",
		);
	}
	return context;
}
