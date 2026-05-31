/** Canonical horizontal padding - mobile-first gutter scale. */
export const marketingPxClass = "px-page";

/** Marketing content max width (~1440px). */
export const marketingMaxWidthClass = "max-w-marketing";

/** Max-width section shell with standard gutters. */
export const marketingSectionClass = [
	"mx-auto w-full",
	marketingMaxWidthClass,
	marketingPxClass,
].join(" ");

/** Default vertical rhythm for marketing sections. */
export const marketingSectionYClass = "py-16 md:py-20";

/** Full section: width cap + gutters + vertical padding. */
export const marketingSectionShellClass = [
	marketingSectionClass,
	marketingSectionYClass,
].join(" ");

/** Homepage / page hero shell - same width as sections, lighter vertical padding. */
export const marketingHeroSectionClass = [
	marketingSectionClass,
	"py-12 md:py-16",
].join(" ");

/** Sticky nav offset - scales down on small screens. */
export const marketingNavStickyClass =
	"sticky z-50 pt-[max(1rem,env(safe-area-inset-top))] sm:pt-6 md:pt-10";

/** Page shell gap below navbar (matches [--section-gap:4rem]). */
export const marketingPageGapClass = "h-(--section-gap,4rem)";

/** Blog article hero + MDX body - shared width and horizontal gutters. */
export const blogPostShellClass = [
	"mx-auto w-full lg:max-w-[60dvw]",
	marketingPxClass,
].join(" ");
