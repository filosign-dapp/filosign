import { SupportCenterPanel } from "@filosign/errors/client";
import { env } from "../../env";

export default function DocsTroubleshootingIsland() {
	const clientBase = env.PUBLIC_CLIENT_URL.replace(/\/$/, "");

	return (
		<div className="not-content">
			<SupportCenterPanel
				showHeader={false}
				appCrossLinkUrl={`${clientBase}/dashboard/support`}
			/>
		</div>
	);
}
