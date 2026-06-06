import { useNavigate, useSearch } from "@tanstack/react-router";

export function useSignNavigation() {
	const navigate = useNavigate();
	const search = useSearch({ from: "/dashboard/document/sign/" });
	const pieceCid = search.pieceCid;

	return { navigate, pieceCid };
}
