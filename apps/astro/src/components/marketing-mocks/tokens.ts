export type MockPanelVariant = "compact" | "default" | "auto";

export const mockPanelShell =
	"rounded-2xl border border-border/40 bg-background shadow-sm";

export const mockPanelVariants: Record<MockPanelVariant, string> = {
	compact: "flex min-h-[10rem] w-full flex-col justify-center p-4",
	default: "flex min-h-[12rem] w-full flex-col justify-center p-5",
	auto: "w-full p-6",
};
