"use client";

import { useMotionConfig } from "@filosign/motion";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/src/lib/utils/index";

/** Material standard easing: fast sweep, slow settle (MDC / MUI). */
const MATERIAL_STANDARD_EASE = [0.4, 0, 0.2, 1] as const;

const SPINNER_SIZES = {
	sm: { outer: 40 },
	md: { outer: 96 },
} as const;

const CIRCUMFERENCE = 201;
const DASH_STROKE_ARRAY = ["28 173", "92 109", "28 173"];
const DASH_STROKE_OFFSET = [0, -65, -CIRCUMFERENCE];
const DASH_KEYFRAME_TIMES = [0, 0.36, 1];

type PendulumRingSpinnerProps = {
	size?: keyof typeof SPINNER_SIZES;
	className?: string;
	children?: ReactNode;
};

export function PendulumRingSpinner({
	size = "md",
	className,
	children,
}: PendulumRingSpinnerProps) {
	const { reduced } = useMotionConfig();
	const { outer } = SPINNER_SIZES[size];

	return (
		<div
			className={cn(
				"relative inline-flex items-center justify-center",
				className,
			)}
			style={{ width: outer, height: outer }}
		>
			<div className="absolute inset-0 -rotate-90">
				<svg
					className={cn(
						"size-full origin-center text-primary motion-reduce:animate-none",
						!reduced && "animate-send-spinner-rotate",
					)}
					viewBox="0 0 100 100"
					aria-hidden
				>
					<title>Loading</title>
					<motion.circle
						cx="50"
						cy="50"
						r="32"
						fill="none"
						stroke="currentColor"
						strokeWidth="4"
						strokeLinecap="round"
						initial={
							reduced
								? { strokeDasharray: "60 141", strokeDashoffset: 0 }
								: { strokeDasharray: "28 173", strokeDashoffset: 0 }
						}
						animate={
							reduced
								? { strokeDasharray: "60 141", strokeDashoffset: 0 }
								: {
										strokeDasharray: DASH_STROKE_ARRAY,
										strokeDashoffset: DASH_STROKE_OFFSET,
									}
						}
						transition={
							reduced
								? undefined
								: {
										repeat: Infinity,
										duration: 1.4,
										ease: MATERIAL_STANDARD_EASE,
										times: DASH_KEYFRAME_TIMES,
									}
						}
					/>
				</svg>
			</div>
			{children ? (
				<div className="relative z-10 flex items-center justify-center">
					{children}
				</div>
			) : null}
		</div>
	);
}
