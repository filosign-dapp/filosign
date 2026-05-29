import { useReducedMotion } from "motion/react";
import type { ComponentPropsWithoutRef } from "react";

type MotionAwareVideoProps = ComponentPropsWithoutRef<"video"> & {
	/** Shown when user prefers reduced motion instead of playing video */
	poster?: string;
};

export default function MotionAwareVideo({
	autoPlay = true,
	loop = true,
	muted = true,
	playsInline = true,
	poster,
	children,
	className,
	...props
}: MotionAwareVideoProps) {
	const reducedMotion = useReducedMotion();

	if (reducedMotion) {
		if (poster) {
			return (
				<img
					src={poster}
					alt=""
					className={className}
					width={props.width as number | undefined}
					height={props.height as number | undefined}
				/>
			);
		}
		return (
			<video
				{...props}
				className={className}
				autoPlay={false}
				loop={false}
				muted
				playsInline
				preload="none"
			>
				{children}
			</video>
		);
	}

	return (
		<video
			{...props}
			className={className}
			autoPlay={autoPlay}
			loop={loop}
			muted={muted}
			playsInline={playsInline}
		>
			{children}
		</video>
	);
}
