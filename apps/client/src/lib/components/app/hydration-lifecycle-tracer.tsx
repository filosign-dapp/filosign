import { useEffect } from "react";
import { hydrationMark } from "@/src/lib/utils/hydration-lifecycle";
import router from "@/src/router";

/** Subscribes to router lifecycle events (dev-only logs). */
export function HydrationLifecycleTracer() {
	useEffect(() => {
		const unsubBefore = router.subscribe("onBeforeNavigate", (event) => {
			hydrationMark("router:beforeNavigate", {
				to: event.toLocation.pathname,
				from: event.fromLocation?.pathname,
			});
		});

		const unsubResolved = router.subscribe("onResolved", (event) => {
			hydrationMark("router:resolved", {
				to: event.toLocation.pathname,
				pathChanged: event.pathChanged,
			});
		});

		const unsubRendered = router.subscribe("onRendered", (event) => {
			hydrationMark("router:rendered", {
				to: event.toLocation.pathname,
			});
		});

		hydrationMark("router:subscribed");

		return () => {
			unsubBefore();
			unsubResolved();
			unsubRendered();
		};
	}, []);

	return null;
}
