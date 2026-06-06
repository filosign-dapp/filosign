import { useReducedMotion } from "motion/react";
import {
	type ComponentPropsWithoutRef,
	useEffect,
	useRef,
	useState,
} from "react";

type MotionAwareVideoProps = ComponentPropsWithoutRef<"video"> & {
	/** Shown before video loads and when user prefers reduced motion */
	poster?: string;
	/** Load `<source>` bytes only after the element nears the viewport */
	deferUntilVisible?: boolean;
};

export default function MotionAwareVideo({
	autoPlay = true,
	loop = true,
	muted = true,
	playsInline = true,
	poster,
	deferUntilVisible = true,
	preload = "none",
	children,
	className,
	...props
}: MotionAwareVideoProps) {
	const reducedMotion = useReducedMotion();
	const videoRef = useRef<HTMLVideoElement>(null);
	const [shouldLoad, setShouldLoad] = useState(!deferUntilVisible);

	useEffect(() => {
		if (!deferUntilVisible || shouldLoad) return;

		const element = videoRef.current;
		if (!element) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting) {
					setShouldLoad(true);
					observer.disconnect();
				}
			},
			{ rootMargin: "240px" },
		);

		observer.observe(element);
		return () => observer.disconnect();
	}, [deferUntilVisible, shouldLoad]);

	useEffect(() => {
		if (!shouldLoad || reducedMotion) return;

		const video = videoRef.current;
		if (!video || !autoPlay) return;

		void video.play().catch(() => {
			// Autoplay may be blocked until user interaction; poster remains visible.
		});
	}, [shouldLoad, reducedMotion, autoPlay]);

	if (reducedMotion && poster) {
		return (
			<img
				src={poster}
				alt=""
				className={className}
				width={props.width as number | undefined}
				height={props.height as number | undefined}
				loading="lazy"
				decoding="async"
			/>
		);
	}

	return (
		<video
			ref={videoRef}
			{...props}
			className={className}
			poster={poster}
			preload={preload}
			autoPlay={false}
			loop={loop}
			muted={muted}
			playsInline={playsInline}
		>
			{shouldLoad ? children : null}
		</video>
	);
}
