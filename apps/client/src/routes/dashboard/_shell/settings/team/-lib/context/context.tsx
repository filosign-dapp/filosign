import { createContext, useContext } from "react";
import type { TeamSettingsController } from "@/src/routes/dashboard/_shell/settings/team/-lib/hooks/use-team-controller";

const TeamSettingsContext = createContext<TeamSettingsController | null>(null);

export function TeamSettingsProvider({
	value,
	children,
}: {
	value: TeamSettingsController;
	children: React.ReactNode;
}) {
	return (
		<TeamSettingsContext.Provider value={value}>
			{children}
		</TeamSettingsContext.Provider>
	);
}

export function useTeamSettings(): TeamSettingsController {
	const context = useContext(TeamSettingsContext);
	if (!context) {
		throw new Error("useTeamSettings must be used within TeamSettingsProvider");
	}
	return context;
}
