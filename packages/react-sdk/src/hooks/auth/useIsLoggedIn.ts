import { useFilosignRpc } from "../../lib/use-filosign-rpc";

/** Thirdweb + Filosign API session (not crypto unlock). */
export function useIsLoggedIn() {
	const { isAuthed, authedQuery } = useFilosignRpc();
	return {
		...authedQuery,
		data: isAuthed,
	};
}
