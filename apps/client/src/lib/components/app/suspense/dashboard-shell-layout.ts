import { useRouterState } from "@tanstack/react-router";

type RouteMatch = { routeId?: string };

/** True when the active match chain includes the pathless `_shell` layout group. */
export function isDashboardShellLayoutRoute(matches: RouteMatch[]): boolean {
	return matches.some(
		(m) =>
			m.routeId === "/dashboard/_shell" ||
			(typeof m.routeId === "string" &&
				m.routeId.startsWith("/dashboard/_shell/")),
	);
}

export function useDashboardShellLayout(): boolean {
	return useRouterState({
		select: (state) => isDashboardShellLayoutRoute(state.matches),
	});
}
