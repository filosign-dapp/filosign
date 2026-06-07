import { Font } from "@react-email/components";

export function ProtocolFonts() {
	return (
		<>
			<style
				dangerouslySetInnerHTML={{
					__html: `@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Condensed:wght@400;500;600&family=Inter:wght@300;400;500&display=swap');`,
				}}
			/>
			<Font
				fontFamily="Inter"
				fallbackFontFamily={["Arial", "sans-serif"]}
				webFont={{
					url: "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuOKfMZg.ttf",
					format: "truetype",
				}}
				fontWeight={400}
				fontStyle="normal"
			/>
		</>
	);
}
