"use client";

import {
	AnimatePresence,
	motion,
	TWEEN_TOKENS,
	useMotionConfig,
} from "@filosign/motion";
import type { ReactNode } from "react";
import { cn } from "@/src/lib/utils/index";

const STAGE_FLIP_EASE = [0.4, 0, 0.2, 1] as const;

export function SendProgressStageFlip(props: {
	stageKey: string;
	children: ReactNode;
	className?: string;
}) {
	const { reduced } = useMotionConfig();

	return (
		<div className="relative h-full w-full overflow-hidden perspective-[640px]">
			<AnimatePresence mode="sync" initial={false}>
				<motion.div
					key={props.stageKey}
					className={cn(
						"absolute inset-x-0 top-0 flex w-full justify-center text-center",
						props.className,
					)}
					initial={
						reduced
							? false
							: {
									y: "100%",
									opacity: 0.35,
									rotateX: -72,
								}
					}
					animate={{
						y: 0,
						opacity: 1,
						rotateX: 0,
					}}
					exit={
						reduced
							? undefined
							: {
									y: "-100%",
									opacity: 0,
									rotateX: 72,
								}
					}
					transition={
						reduced
							? { duration: 0 }
							: {
									...TWEEN_TOKENS.normal,
									duration: 0.38,
									ease: STAGE_FLIP_EASE,
								}
					}
					style={{
						transformOrigin: "50% 50%",
						backfaceVisibility: "hidden",
					}}
				>
					{props.children}
				</motion.div>
			</AnimatePresence>
		</div>
	);
}
