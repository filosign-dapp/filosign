import { CaretRightIcon } from "@phosphor-icons/react";
import { type KeyboardEvent, useMemo, useState } from "react";
import { isReservedAccountFirstName } from "@/src/lib/auth/account-defaults";
import { Button } from "@/src/lib/components/ui/button";
import {
	FeatureShellActions,
	FeatureShellBody,
} from "@/src/lib/components/ui/feature-shell";
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";
import { InlineLoader } from "@/src/lib/components/ui/loader";

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

	const trimmedFirstName = firstName.trim();
	const reservedFirstName = useMemo(
		() => isReservedAccountFirstName(trimmedFirstName),
		[trimmedFirstName],
	);
	const canContinue = Boolean(trimmedFirstName) && !reservedFirstName;

	const submit = () => {
		if (!canContinue) return;
		void onContinue({
			firstName: trimmedFirstName,
			lastName: lastName.trim(),
		});
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Enter" && canContinue && !disabled) {
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
						aria-invalid={reservedFirstName || undefined}
					/>
					{reservedFirstName ? (
						<p className="text-sm text-destructive">
							Choose a different first name. That placeholder is not allowed.
						</p>
					) : null}
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
				{disabled ? (
					<div className="flex w-full justify-center py-2">
						<InlineLoader size="lg" />
					</div>
				) : (
					<Button
						type="button"
						onClick={submit}
						disabled={!canContinue}
						className="group w-full"
						variant="primary"
						size="lg"
					>
						Continue
						<CaretRightIcon
							className="size-4 transition-transform duration-200 group-hover:translate-x-1"
							weight="bold"
						/>
					</Button>
				)}
			</FeatureShellActions>
		</FeatureShellBody>
	);
}
