export type MockPanelVariant = "compact" | "default" | "auto";

export const mockPanelShell =
	"rounded-2xl border border-border/40 bg-background shadow-sm";

export const mockPanelVariants: Record<MockPanelVariant, string> = {
	compact: "flex h-[168px] w-full flex-col justify-center p-4",
	default: "flex h-[192px] w-full flex-col justify-center p-5",
	auto: "w-full p-6",
};
