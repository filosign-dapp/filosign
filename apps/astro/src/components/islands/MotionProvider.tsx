import { MotionConfig, SPRING_TOKENS } from "@filosign/motion";
import type { ReactNode } from "react";

export function MotionProvider({ children }: { children: ReactNode }) {
	return (
		<MotionConfig reducedMotion="user" transition={SPRING_TOKENS.smooth}>
			{children}
		</MotionConfig>
	);
}
