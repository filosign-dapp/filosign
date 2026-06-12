import { cn } from "@/src/lib/utils";

export type BackdropImageProps = {
	src: string;
	imageClassName?: string;
	scrimClassName?: string;
	/** Solid wash over the image. Disable when using a custom gradient scrim. */
	defaultScrim?: boolean;
};

export function BackdropImage({
	src,
	imageClassName,
	scrimClassName,
	defaultScrim = true,
}: BackdropImageProps) {
	return (
		<>
			<img
				src={src}
				alt=""
				className={cn(
					"absolute inset-0 size-full scale-125 object-cover opacity-45 blur-3xl saturate-[1.12] dark:opacity-15",
					imageClassName,
				)}
			/>
			{defaultScrim || scrimClassName ? (
				<div
					className={cn(
						defaultScrim && "bg-background/50 dark:bg-background/60",
						"absolute inset-0",
						scrimClassName,
					)}
				/>
			) : null}
		</>
	);
}

type PageBackdropProps = BackdropImageProps & {
	className?: string;
};

export function PageBackdrop({
	src,
	className,
	imageClassName,
	scrimClassName,
}: PageBackdropProps) {
	return (
		<div
			aria-hidden
			className={cn(
				"pointer-events-none absolute inset-0 overflow-hidden",
				className,
			)}
		>
			<BackdropImage
				src={src}
				imageClassName={imageClassName}
				scrimClassName={scrimClassName}
			/>
		</div>
	);
}
