import { useContext } from "react";
import {
	PlacementCanvasContext,
	type PlacementCanvasContextValue,
} from "@/src/routes/dashboard/envelope/create/add-sign/-lib/context/placement-canvas-context";

export function usePlacementCanvas(): PlacementCanvasContextValue {
	const ctx = useContext(PlacementCanvasContext);
	if (!ctx) {
		throw new Error("usePlacementCanvas requires PlacementCanvasProvider");
	}
	return ctx;
}
