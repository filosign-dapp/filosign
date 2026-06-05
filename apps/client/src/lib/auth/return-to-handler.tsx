import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { navigateToReturnTo } from "./return-to";

/** Runs once after dashboard auth gates pass to restore a pre-login deep link. */
export function ReturnToHandler() {
	const navigate = useNavigate();
	const consumedRef = useRef(false);

	useEffect(() => {
		if (consumedRef.current) return;
		consumedRef.current = true;
		navigateToReturnTo(navigate);
	}, [navigate]);

	return null;
}
