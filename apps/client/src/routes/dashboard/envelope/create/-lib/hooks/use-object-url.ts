import { useEffect, useState } from "react";

/** Stable object URL for a `File`; revoked on change/unmount. */
export function useObjectUrl(file: File | null | undefined): string | null {
	const [url, setUrl] = useState<string | null>(null);

	useEffect(() => {
		if (!file) {
			setUrl(null);
			return;
		}
		const next = URL.createObjectURL(file);
		setUrl(next);
		return () => URL.revokeObjectURL(next);
	}, [file]);

	return url;
}
