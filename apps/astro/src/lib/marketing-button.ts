/** Shared marketing CTA styles - focus rings, no transition-all, no outline-none without replacement. */
export const marketingButtonFocus =
	"focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring";

export const marketingButtonMotion =
	"transition-[color,background-color,transform,opacity] duration-200";

export const marketingPrimaryLgClass = [
	"group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-base font-medium whitespace-nowrap select-none min-h-11 h-12 gap-2 px-8 bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto",
	marketingButtonFocus,
	marketingButtonMotion,
].join(" ");

export const marketingGhostLgClass = [
	"group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-border bg-clip-padding text-base font-medium whitespace-nowrap select-none min-h-11 h-12 gap-2 px-8 text-foreground hover:bg-muted w-full sm:w-auto",
	marketingButtonFocus,
	marketingButtonMotion,
].join(" ");

/** Compact primary - in-card CTAs, trust/about bands, nav. */
export const marketingPrimaryMdClass = [
	"group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap select-none min-h-11 h-11 gap-1.5 px-6 bg-primary text-primary-foreground hover:bg-primary/90",
	marketingButtonFocus,
	marketingButtonMotion,
].join(" ");

export const marketingNavCtaClass = [
	marketingPrimaryMdClass,
	"min-w-28 font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/90",
].join(" ");

export const marketingPricingPrimaryClass = marketingPrimaryLgClass;

export const marketingPricingGhostClass = marketingGhostLgClass;

export const marketingFooterCtaClass = marketingPrimaryLgClass;
