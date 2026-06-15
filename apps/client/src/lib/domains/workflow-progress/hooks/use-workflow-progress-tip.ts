"use client";

import { useEffect, useState } from "react";
import {
	pickRandomWorkflowTip,
	WORKFLOW_TIP_INTERVAL_MS,
} from "@/src/lib/domains/workflow-progress/utils/tips";

export function useWorkflowProgressTip<T extends string>(
	active: boolean,
	tips: readonly T[],
): T {
	const [tip, setTip] = useState<T>(() => pickRandomWorkflowTip(tips));

	useEffect(() => {
		if (!active) return;

		const timer = window.setInterval(() => {
			setTip((current) => pickRandomWorkflowTip(tips, current));
		}, WORKFLOW_TIP_INTERVAL_MS);

		return () => window.clearInterval(timer);
	}, [active, tips]);

	return tip;
}
