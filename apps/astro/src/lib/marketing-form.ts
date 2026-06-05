import { marketingButtonFocus } from "./marketing-button";

export const marketingFieldLabelClass =
	"block text-xs font-semibold uppercase tracking-wider text-muted-foreground font-manrope";

export const marketingFieldHintClass =
	"text-xs text-muted-foreground font-manrope leading-relaxed";

export const marketingFieldClass = [
	"w-full rounded-2xl border border-border/80 bg-muted/30 px-4 py-3.5 text-sm text-foreground font-manrope placeholder:text-muted-foreground",
	marketingButtonFocus,
	"transition-[color,background-color,border-color,box-shadow] duration-200",
].join(" ");

export const marketingStepperButtonClass = [
	"inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-foreground hover:bg-background/80 disabled:pointer-events-none disabled:opacity-40",
	marketingButtonFocus,
	"transition-[color,background-color] duration-200",
].join(" ");
