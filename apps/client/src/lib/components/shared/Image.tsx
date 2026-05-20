import type { ReactNode } from "react";
import { useState } from "react";
import { cn } from "../../utils";

type Props = {
	src?: string | null;
	alt?: string | null;
	className?: string;
	fallback?: string;
	children?: ReactNode;
	width?: number;
	height?: number;
};

export function Image({
	src,
	alt,
	className,
	fallback = "/images/placeholder.png",
	children,
	width,
	height,
	...props
}: Props) {
	const [hasError, setHasError] = useState(false);

	if (!src || hasError) {
		return children ? (
			<div className={cn("flex items-center justify-center", className)}>
				{children}
			</div>
		) : (
			<img
				src={fallback}
				alt={alt || "default"}
				className={cn(className)}
				{...props}
			/>
		);
	}

	return (
		<img
			width={width}
			height={height}
			src={src}
			alt={alt || "default"}
			className={cn(className)}
			onError={() => setHasError(true)}
			{...props}
		/>
	);
}
