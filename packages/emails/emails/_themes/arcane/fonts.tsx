import { Font } from "@react-email/components";

export function ArcaneFonts() {
	return (
		<>
			<style
				dangerouslySetInnerHTML={{
					__html: `@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap');`,
				}}
			/>
			<Font
				fontFamily="Instrument Serif"
				fallbackFontFamily={["Georgia", "serif"]}
				webFont={{
					url: "https://fonts.gstatic.com/s/instrumentserif/v4/pxiTypc9vsFDm051Uf6KVwgkfoSxQ0GsQv8ToedPibnr0SZD1lvzxGyGQsl.woff2",
					format: "woff2",
				}}
				fontWeight={400}
				fontStyle="normal"
			/>
		</>
	);
}
