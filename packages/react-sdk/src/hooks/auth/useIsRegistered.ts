import { useKeyRegistrySnapshot } from "./useKeyRegistrySnapshot";

export function useIsRegistered() {
	const snapshot = useKeyRegistrySnapshot();

	return {
		...snapshot,
		data: snapshot.data?.isRegistered,
	};
}
