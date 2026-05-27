import { SPRING_TOKENS, type SpringPreset } from "@filosign/motion";

/** Nav intro timing — landing (dramatic) vs inner pages (faster). */
export const NAV_INTRO_DELAYS = {
	landing: {
		nav: 0,
		linkGroup: 0.43,
		linkBase: 0.52,
		linkStagger: 0.087,
		cta: 0.78,
	},
	page: {
		nav: 0,
		linkGroup: 0.22,
		linkBase: 0.3,
		linkStagger: 0.05,
		cta: 0.5,
	},
} as const;

export type MarketingPace = keyof typeof NAV_INTRO_DELAYS;

/** Longest nav intro (links + CTA) before scroll-only motion applies. */
export function navIntroDurationMs(pace: MarketingPace): number {
	const d = NAV_INTRO_DELAYS[pace];
	const lastLink = d.linkBase + 3 * d.linkStagger;
	return Math.ceil(Math.max(lastLink, d.cta) * 1000) + 400;
}

export const CONTENT_STAGGER = {
	landing: { staggerDelay: 0.1, preset: "soft" as SpringPreset },
	page: { staggerDelay: 0.07, preset: "smooth" as SpringPreset },
} as const;

/** Scroll hide/show for sticky nav — lighter than intro. */
export const NAV_SCROLL_SPRING = {
	type: "spring" as const,
	stiffness: 400,
	damping: 35,
};

/** Hero + body choreography after nav intro (landing vs inner pages). */
export const PAGE_SEQUENCE = {
	landing: {
		heroItemSpring: SPRING_TOKENS.soft,
		heroStagger: 0.12,
		bottomHiddenY: 32,
		bottomSpring: SPRING_TOKENS.smooth,
		bottomStagger: 0.1,
	},
	page: {
		heroItemSpring: SPRING_TOKENS.snappy,
		heroStagger: 0.08,
		bottomHiddenY: 24,
		bottomSpring: SPRING_TOKENS.snappy,
		bottomStagger: 0.07,
	},
} as const;

/** Seconds after load before hero copy stagger begins (post–nav intro). */
export function navIntroEndSec(pace: MarketingPace): number {
	const { cta } = NAV_INTRO_DELAYS[pace];
	return cta + 0.12;
}

/** When hero media / bottom block should start (after top copy stagger). */
export function heroBottomStartSec(
	pace: MarketingPace,
	topChildCount: number,
): number {
	const { heroStagger } = PAGE_SEQUENCE[pace];
	const count = Math.max(topChildCount, 1);
	return navIntroEndSec(pace) + count * heroStagger + 0.15;
}

/** When main page body stagger begins (below hero). */
export function pageBodyStartSec(
	pace: MarketingPace,
	heroTopChildCount: number,
	heroBottomChildCount: number,
): number {
	const { bottomStagger } = PAGE_SEQUENCE[pace];
	const bottomCount = Math.max(heroBottomChildCount, 1);
	const bottomSettleSec = 0.45;
	return (
		heroBottomStartSec(pace, heroTopChildCount) +
		bottomSettleSec +
		(bottomCount - 1) * bottomStagger
	);
}
