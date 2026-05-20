import { useFilosignContext } from "@filosign/react";
import { useAuthedApi } from "@filosign/react/auth";
import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";

/** Batch profile lookups by email (envelope recipients, etc.). */
export function useProfilesByEmails(emails: string[]) {
	const { rpcQuery } = useFilosignContext();
	const { data: auth } = useAuthedApi();
	const isAuthed = !!auth;

	const uniqueEmails = useMemo(
		() => [
			...new Set(
				emails
					.map((e) => e.trim().toLowerCase())
					.filter((e) => e.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)),
			),
		],
		[emails],
	);

	const queries = useQueries({
		queries: uniqueEmails.map((email) => ({
			...rpcQuery.users.profile.lookup.queryOptions({
				input: { query: email },
			}),
			enabled: isAuthed && !!email,
		})),
	});

	const map = useMemo(() => {
		const next = new Map<string, NonNullable<(typeof queries)[0]["data"]>>();
		for (let i = 0; i < uniqueEmails.length; i++) {
			const email = uniqueEmails[i];
			const data = queries[i]?.data;
			if (email && data) next.set(email, data);
		}
		return next;
	}, [uniqueEmails, queries]);

	return {
		byEmail: map,
		isLoading: queries.some((q) => q.isLoading),
	};
}
