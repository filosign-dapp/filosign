import { useContext } from "react";
import {
	SignHeaderUiContext,
	type SignHeaderUiContextValue,
} from "@/src/routes/dashboard/document/sign/-lib/context/header-ui-context";

export function useSignHeaderUi(): SignHeaderUiContextValue {
	const context = useContext(SignHeaderUiContext);
	if (!context) {
		throw new Error("useSignHeaderUi must be used within SignHeaderUiProvider");
	}
	return context;
}
