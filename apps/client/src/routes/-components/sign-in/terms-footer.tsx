import env from "@/src/env";
import { Checkbox } from "@/src/lib/components/ui/checkbox";

interface SignInTermsFooterProps {
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	requiresPilotAddendum?: boolean;
}

export function SignInTermsFooter({
	checked,
	onCheckedChange,
	requiresPilotAddendum = false,
}: SignInTermsFooterProps) {
	const astroBase = env.VITE_ASTRO_URL.replace(/\/$/, "");

	return (
		<div className="flex items-start gap-2.5 text-left text-xs text-muted-foreground max-w-sm mx-auto my-2">
			<Checkbox
				id="terms-checkbox"
				checked={checked}
				onCheckedChange={(val) => onCheckedChange(val === true)}
				className="mt-0.5 shrink-0"
			/>
			<label
				htmlFor="terms-checkbox"
				className="leading-normal cursor-pointer select-none"
			>
				I agree to the{" "}
				<a
					href={`${astroBase}/terms`}
					target="_blank"
					rel="noopener noreferrer"
					className="underline underline-offset-2 hover:text-foreground font-medium"
				>
					Terms of Service
				</a>
				, acknowledge the{" "}
				<a
					href={`${astroBase}/privacy`}
					target="_blank"
					rel="noopener noreferrer"
					className="underline underline-offset-2 hover:text-foreground font-medium"
				>
					Privacy Policy
				</a>
				{requiresPilotAddendum ? (
					<>
						, and the{" "}
						<a
							href={`${astroBase}/legal/design-partner-addendum`}
							target="_blank"
							rel="noopener noreferrer"
							className="underline underline-offset-2 hover:text-foreground font-medium"
						>
							Design Partner Addendum
						</a>
					</>
				) : null}
				, and confirm I am using the Service solely for business, professional,
				or commercial purposes.
			</label>
		</div>
	);
}
