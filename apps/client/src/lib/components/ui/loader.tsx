import { cn } from "@/src/lib/utils/index";

import { InlineLoader, type InlineLoaderProps } from "./inline-loader";

interface LoaderProps extends Pick<InlineLoaderProps, "size"> {
	text?: string;
	className?: string;
}

export function Loader({ text, size = "md", className }: LoaderProps) {
	return (
		<div
			className={cn(
				"flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4",
				className,
			)}
		>
			<InlineLoader size={size} />
			{text ? (
				<p className="text-center text-sm text-muted-foreground">{text}</p>
			) : null}
		</div>
	);
}
