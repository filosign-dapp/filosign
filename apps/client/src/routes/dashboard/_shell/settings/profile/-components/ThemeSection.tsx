import { MonitorIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/src/lib/components/ui/card";
import { useTheme } from "@/src/lib/components/ui/theme-provider";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "@/src/lib/components/ui/toggle-group";

export function ThemeSection() {
	const { theme, setTheme } = useTheme();

	return (
		<Card className="border-border/50 shadow-none">
			<CardHeader className="space-y-0.5 pb-4">
				<CardTitle className="text-sm font-medium text-foreground/85">
					Appearance
				</CardTitle>
				<p className="text-xs font-normal text-muted-foreground">
					Customize the application's visual theme.
				</p>
			</CardHeader>
			<CardContent className="pt-0">
				<ToggleGroup
					value={[theme]}
					onValueChange={(values: readonly string[]) => {
						if (values && values.length > 0) {
							setTheme(values[0] as "light" | "dark" | "system");
						}
					}}
					variant="outline"
					spacing={0}
					className="w-full flex"
				>
					<ToggleGroupItem
						value="light"
						className="flex-1 h-9 gap-2 text-xs font-normal text-muted-foreground/80 hover:text-foreground data-[state=on]:bg-muted/40 data-[state=on]:text-foreground transition-all"
						aria-label="Light mode"
					>
						<SunIcon className="size-4 opacity-80" />
						<span>Light</span>
					</ToggleGroupItem>
					<ToggleGroupItem
						value="dark"
						className="flex-1 h-9 gap-2 text-xs font-normal text-muted-foreground/80 hover:text-foreground data-[state=on]:bg-muted/40 data-[state=on]:text-foreground transition-all"
						aria-label="Dark mode"
					>
						<MoonIcon className="size-4 opacity-80" />
						<span>Dark</span>
					</ToggleGroupItem>
					<ToggleGroupItem
						value="system"
						className="flex-1 h-9 gap-2 text-xs font-normal text-muted-foreground/80 hover:text-foreground data-[state=on]:bg-muted/40 data-[state=on]:text-foreground transition-all"
						aria-label="System preference"
					>
						<MonitorIcon className="size-4 opacity-80" />
						<span>System</span>
					</ToggleGroupItem>
				</ToggleGroup>
			</CardContent>
		</Card>
	);
}
