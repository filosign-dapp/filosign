export const COMPOSE_SECTION_SPRING = {
	type: "spring" as const,
	stiffness: 200,
	damping: 25,
};

export function composeSectionMotion(delay: number) {
	return {
		initial: { opacity: 0, y: 30 },
		animate: { opacity: 1, y: 0 },
		transition: { ...COMPOSE_SECTION_SPRING, delay },
	};
}

/** For sections that mount after user input (e.g. payouts once recipients exist). */
export function composeSectionEnterMotion() {
	return composeSectionMotion(0.1);
}

/** Stagger delays for compose page sections (after documents + recipients). */
export const COMPOSE_SECTION_DELAYS = {
	upgradeHint: 0.5,
} as const;
