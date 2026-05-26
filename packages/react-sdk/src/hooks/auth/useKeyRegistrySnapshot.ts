import { useQuery } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import { keyRegistrySnapshotQueryOptions } from "./key-registry-snapshot";

export function useKeyRegistrySnapshot() {
	const { rpc, wallet } = useFilosignContext();
	return useQuery(keyRegistrySnapshotQueryOptions(rpc, wallet));
}
