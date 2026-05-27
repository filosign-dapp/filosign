import { MotionReveal, Pressable } from "@filosign/motion";
import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import { Button } from "@/src/lib/components/ui/button";

export default function ThemeSwitch() {
	const { resolvedTheme, setTheme } = useTheme();
	const isDark = resolvedTheme === "dark";

	return (
		<MotionReveal preset="snappy" id="theme-switch-reveal">
			<Pressable
				preset="snappy"
				whileHover={{ scale: 1.1 }}
				whileTap={{ scale: 0.95 }}
			>
				<Button
					variant="secondary"
					size="icon"
					onClick={() => setTheme(isDark ? "light" : "dark")}
				>
					{isDark ? <MoonIcon /> : <SunIcon />}
					<span className="sr-only">Toggle theme</span>
				</Button>
			</Pressable>
		</MotionReveal>
	);
}
