import { useKeyRegistrySnapshot } from "./useKeyRegistrySnapshot";

export function useStoredKeygenData() {
	const snapshot = useKeyRegistrySnapshot();

	return {
		...snapshot,
		data: snapshot.data?.storedKeygenData,
	};
}
