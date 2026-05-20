import { createFileRoute } from "@tanstack/react-router";
import { ProfileSettingsPage } from "./-components/page";
import { ProfileSettingsProvider } from "./-lib/context/context";
import { useProfileSettings } from "./-lib/hooks/use-profile-settings";

function ProfileRoutePage() {
	const settings = useProfileSettings();
	return (
		<ProfileSettingsProvider value={settings}>
			<ProfileSettingsPage />
		</ProfileSettingsProvider>
	);
}

export const Route = createFileRoute("/dashboard/_shell/settings/profile/")({
	component: ProfileRoutePage,
});
