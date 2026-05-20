import { cn } from "@/src/lib/utils/index";

export function EmptyHint({
	title,
	className,
}: {
	title: string;
	className?: string;
}) {
	return (
		<p
			className={cn(
				"py-12 text-center text-sm text-muted-foreground",
				className,
			)}
		>
			{title}
		</p>
	);
}
