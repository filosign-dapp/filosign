import { createContext, useContext } from "react";
import type { ProfileSettingsState } from "@/src/routes/dashboard/_shell/settings/profile/-lib/hooks/use-profile-settings";

const ProfileSettingsContext = createContext<ProfileSettingsState | null>(null);

export function ProfileSettingsProvider({
	value,
	children,
}: {
	value: ProfileSettingsState;
	children: React.ReactNode;
}) {
	return (
		<ProfileSettingsContext.Provider value={value}>
			{children}
		</ProfileSettingsContext.Provider>
	);
}

export function useProfileSettingsContext(): ProfileSettingsState {
	const context = useContext(ProfileSettingsContext);
	if (!context) {
		throw new Error(
			"useProfileSettingsContext must be used within ProfileSettingsProvider",
		);
	}
	return context;
}
