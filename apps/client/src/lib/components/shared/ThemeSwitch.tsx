import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useTheme } from "next-themes";
import { Button } from "../ui/button";

export default function ThemeSwitch() {
	const { resolvedTheme, setTheme } = useTheme();
	const isDark = resolvedTheme === "dark";

	return (
		<motion.div
			initial={{ opacity: 0, scale: 0 }}
			animate={{ opacity: 1, scale: 1 }}
			whileHover={{ scale: 1.1 }}
			transition={{
				scale: { type: "spring", visualDuration: 0.2, bounce: 0.5 },
			}}
		>
			<Button
				variant="secondary"
				size="icon"
				onClick={() => setTheme(isDark ? "light" : "dark")}
			>
				{isDark ? <MoonIcon /> : <SunIcon />}
				<span className="sr-only">Toggle theme</span>
			</Button>
		</motion.div>
	);
}
