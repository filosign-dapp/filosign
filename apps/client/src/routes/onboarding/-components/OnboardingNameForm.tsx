import { CaretRightIcon } from "@phosphor-icons/react";
import { type KeyboardEvent, useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import {
	FeatureShellActions,
	FeatureShellBody,
} from "@/src/lib/components/ui/feature-shell";
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";

export type OnboardingNamePayload = {
	firstName: string;
	lastName: string;
};

type OnboardingNameFormProps = {
	onContinue: (names: OnboardingNamePayload) => void | Promise<void>;
	disabled?: boolean;
};

export function OnboardingNameForm({
	onContinue,
	disabled = false,
}: OnboardingNameFormProps) {
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");

	const submit = () => {
		void onContinue({
			firstName: firstName.trim(),
			lastName: lastName.trim(),
		});
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Enter" && firstName.trim() && !disabled) {
			submit();
		}
	};

	return (
		<FeatureShellBody>
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-2">
					<Label htmlFor="onboarding-first-name">First name</Label>
					<Input
						id="onboarding-first-name"
						variant="field"
						value={firstName}
						onChange={(event) => setFirstName(event.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="John"
						autoFocus
						disabled={disabled}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="onboarding-last-name">Last name</Label>
					<Input
						id="onboarding-last-name"
						variant="field"
						value={lastName}
						onChange={(event) => setLastName(event.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Doe"
						disabled={disabled}
					/>
				</div>
			</div>
			<FeatureShellActions>
				<Button
					type="button"
					onClick={submit}
					disabled={!firstName.trim() || disabled}
					className="group w-full"
					variant="primary"
					size="lg"
					isLoading={disabled}
				>
					Continue
					{!disabled ? (
						<CaretRightIcon
							className="size-4 transition-transform duration-200 group-hover:translate-x-1"
							weight="bold"
						/>
					) : null}
				</Button>
			</FeatureShellActions>
		</FeatureShellBody>
	);
}
