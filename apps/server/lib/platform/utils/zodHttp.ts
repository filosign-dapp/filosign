import { z } from "zod";

type TreeNode = {
	errors?: string[];
	properties?: Record<string, TreeNode>;
	items?: TreeNode[];
};

function firstTreeifyMessage(node: TreeNode): string | null {
	if (node.errors?.length) {
		return node.errors[0] ?? null;
	}
	if (node.properties) {
		for (const child of Object.values(node.properties)) {
			const msg = firstTreeifyMessage(child);
			if (msg) return msg;
		}
	}
	if (node.items?.length) {
		for (const item of node.items) {
			const msg = firstTreeifyMessage(item);
			if (msg) return msg;
		}
	}
	return null;
}

/** Short client-safe message from a failed `.safeParse` (see [Zod error formatting](https://zod.dev/error-formatting)). */
export function zodSafeParseMessage(error: z.ZodError): string {
	const tree = z.treeifyError(error) as TreeNode;
	return firstTreeifyMessage(tree) ?? "Invalid request";
}
