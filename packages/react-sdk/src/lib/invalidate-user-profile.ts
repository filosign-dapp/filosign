import { useQueryClient } from "@tanstack/react-query";
import { useFilosignContext } from "../context/useFilosignContext";
import { invalidateUserProfile as invalidateUserProfileQueries } from "./invalidate-queries";

export { invalidateUserProfile } from "./invalidate-queries";

export function useInvalidateUserProfile() {
	const queryClient = useQueryClient();
	const { rpcQuery } = useFilosignContext();
	return () => {
		void invalidateUserProfileQueries(queryClient, rpcQuery);
	};
}
