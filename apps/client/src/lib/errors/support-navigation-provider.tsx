import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { setSupportNavigateHandler } from "./support-navigation";

export function SupportNavigationProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const navigate = useNavigate();

	useEffect(() => {
		setSupportNavigateHandler((opts) => navigate({ to: opts.to }));
		return () => setSupportNavigateHandler(null);
	}, [navigate]);

	return <>{children}</>;
}
