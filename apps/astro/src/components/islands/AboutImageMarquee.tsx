import { SPRING_TOKENS } from "@filosign/motion";
import {
	motion,
	useAnimationFrame,
	useMotionValue,
	useReducedMotion,
	useSpring,
} from "motion/react";
import { useEffect, useRef } from "react";
import { aboutMedia } from "../../config/about-media";

const START_DELAY_SEC = 1;
const CYCLE_DURATION_SEC = 60;

function marqueeDistanceProgress(t: number): number {
	const rampInEnd = 0.2;
	const cruiseEnd = 0.8;
	const rampInShare = 0.07;
	const rampOutShare = 0.07;
	const cruiseShare = 1 - rampInShare - rampOutShare;

	if (t <= 0) return 0;
	if (t >= 1) return 1;

	if (t < rampInEnd) {
		const u = t / rampInEnd;
		return rampInShare * u * u * u;
	}

	if (t < cruiseEnd) {
		const u = (t - rampInEnd) / (cruiseEnd - rampInEnd);
		return rampInShare + cruiseShare * u;
	}

	const u = (t - cruiseEnd) / (1 - cruiseEnd);
	const easeOut = 1 - (1 - u) ** 3;
	return rampInShare + cruiseShare + rampOutShare * easeOut;
}

type AboutImageMarqueeProps = {
	images?: readonly string[];
};

export default function AboutImageMarquee({
	images = aboutMedia.marquee,
}: AboutImageMarqueeProps) {
	const reducedMotion = useReducedMotion();
	const trackRef = useRef<HTMLDivElement>(null);
	const halfWidthRef = useRef(0);
	const startTimeRef = useRef<number | null>(null);
	const loopImages = [...images, ...images];

	const targetX = useMotionValue(0);
	const x = useSpring(targetX, {
		...SPRING_TOKENS.glide,
		restDelta: 1.5,
	});
	const prevCycleTRef = useRef(0);

	useEffect(() => {
		const track = trackRef.current;
		if (!track) return;

		const measure = () => {
			halfWidthRef.current = track.scrollWidth / 2;
		};

		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(track);
		return () => observer.disconnect();
	}, [loopImages.length]);

	useAnimationFrame((time) => {
		if (reducedMotion) return;

		const halfWidth = halfWidthRef.current;
		if (halfWidth <= 0) return;

		if (startTimeRef.current === null) {
			startTimeRef.current = time;
		}

		const elapsedSec = (time - startTimeRef.current) / 1000 - START_DELAY_SEC;
		if (elapsedSec < 0) {
			targetX.set(0);
			return;
		}

		const cycleT = (elapsedSec % CYCLE_DURATION_SEC) / CYCLE_DURATION_SEC;
		const progress = marqueeDistanceProgress(cycleT);
		const nextX = -halfWidth * progress;

		if (cycleT < prevCycleTRef.current) {
			targetX.jump(0);
			x.jump(0);
		}

		prevCycleTRef.current = cycleT;
		targetX.set(nextX);
	});

	return (
		<div className="w-full overflow-hidden px-4 sm:px-6" aria-hidden>
			<motion.div
				ref={trackRef}
				className="flex w-max gap-4 will-change-transform"
				style={{ x: reducedMotion ? 0 : x }}
			>
				{loopImages.map((src, index) => (
					<div
						key={`${src}-${index}`}
						className="relative min-h-[min(400px,55dvh)] w-[85vw] shrink-0 overflow-hidden rounded-3xl sm:w-[72vw] sm:min-h-[min(420px,50dvh)] md:h-[55vh] md:w-[52vw] lg:w-[38vw]"
					>
						<img
							src={src}
							alt=""
							width={960}
							height={720}
							decoding="async"
							loading={index < 2 ? "eager" : "lazy"}
							className="h-full w-full object-cover"
						/>
					</div>
				))}
			</motion.div>
		</div>
	);
}
