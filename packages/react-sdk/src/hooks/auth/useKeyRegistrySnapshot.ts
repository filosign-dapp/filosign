import { useQuery } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import { keyRegistrySnapshotQueryOptions } from "./key-registry-snapshot";

export function useKeyRegistrySnapshot() {
	const { contracts, wallet } = useFilosignContext();
	return useQuery(keyRegistrySnapshotQueryOptions(contracts, wallet));
}
