"use client";

import { useEffect, useState } from "react";
import {
	pickRandomSendProgressTip,
	SEND_PROGRESS_TIP_INTERVAL_MS,
	type SendProgressTip,
} from "@/src/routes/dashboard/envelope/create/add-sign/-lib/send-progress-tips";

export function useSendProgressTip(active: boolean): SendProgressTip {
	const [tip, setTip] = useState<SendProgressTip>(() =>
		pickRandomSendProgressTip(),
	);

	useEffect(() => {
		if (!active) return;

		const timer = window.setInterval(() => {
			setTip((current) => pickRandomSendProgressTip(current));
		}, SEND_PROGRESS_TIP_INTERVAL_MS);

		return () => window.clearInterval(timer);
	}, [active]);

	return tip;
}
