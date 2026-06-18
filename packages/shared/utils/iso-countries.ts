import z from "zod";

/** ISO 3166-1 alpha-2 options for workspace intake forms (sorted by name). */
export const ISO_COUNTRY_OPTIONS = [
	{ code: "AE", name: "United Arab Emirates" },
	{ code: "AR", name: "Argentina" },
	{ code: "AT", name: "Austria" },
	{ code: "AU", name: "Australia" },
	{ code: "BE", name: "Belgium" },
	{ code: "BG", name: "Bulgaria" },
	{ code: "BR", name: "Brazil" },
	{ code: "CA", name: "Canada" },
	{ code: "CH", name: "Switzerland" },
	{ code: "CL", name: "Chile" },
	{ code: "CN", name: "China" },
	{ code: "CO", name: "Colombia" },
	{ code: "CY", name: "Cyprus" },
	{ code: "CZ", name: "Czechia" },
	{ code: "DE", name: "Germany" },
	{ code: "DK", name: "Denmark" },
	{ code: "EE", name: "Estonia" },
	{ code: "ES", name: "Spain" },
	{ code: "FI", name: "Finland" },
	{ code: "FR", name: "France" },
	{ code: "GB", name: "United Kingdom" },
	{ code: "GR", name: "Greece" },
	{ code: "HK", name: "Hong Kong" },
	{ code: "HR", name: "Croatia" },
	{ code: "HU", name: "Hungary" },
	{ code: "ID", name: "Indonesia" },
	{ code: "IE", name: "Ireland" },
	{ code: "IL", name: "Israel" },
	{ code: "IN", name: "India" },
	{ code: "IS", name: "Iceland" },
	{ code: "IT", name: "Italy" },
	{ code: "JP", name: "Japan" },
	{ code: "KR", name: "South Korea" },
	{ code: "LT", name: "Lithuania" },
	{ code: "LU", name: "Luxembourg" },
	{ code: "LV", name: "Latvia" },
	{ code: "MX", name: "Mexico" },
	{ code: "MY", name: "Malaysia" },
	{ code: "NG", name: "Nigeria" },
	{ code: "NL", name: "Netherlands" },
	{ code: "NO", name: "Norway" },
	{ code: "NZ", name: "New Zealand" },
	{ code: "PH", name: "Philippines" },
	{ code: "PL", name: "Poland" },
	{ code: "PT", name: "Portugal" },
	{ code: "RO", name: "Romania" },
	{ code: "SE", name: "Sweden" },
	{ code: "SG", name: "Singapore" },
	{ code: "SI", name: "Slovenia" },
	{ code: "SK", name: "Slovakia" },
	{ code: "TH", name: "Thailand" },
	{ code: "TR", name: "Turkey" },
	{ code: "TW", name: "Taiwan" },
	{ code: "UA", name: "Ukraine" },
	{ code: "US", name: "United States" },
	{ code: "VN", name: "Vietnam" },
	{ code: "ZA", name: "South Africa" },
] as const;

const isoCountryCodes = ISO_COUNTRY_OPTIONS.map((entry) => entry.code) as [
	(typeof ISO_COUNTRY_OPTIONS)[number]["code"],
	...(typeof ISO_COUNTRY_OPTIONS)[number]["code"][],
];

export type IsoCountryCode = (typeof ISO_COUNTRY_OPTIONS)[number]["code"];

export const zIsoCountryCode = z.enum(isoCountryCodes, {
	error: "Select a valid country",
});

export function isoCountryName(code: string): string | null {
	const match = ISO_COUNTRY_OPTIONS.find((entry) => entry.code === code);
	return match?.name ?? null;
}
