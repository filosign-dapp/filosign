import { CaretRightIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/src/lib/components/ui/card";
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

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && firstName.trim() && !disabled) {
			submit();
		}
	};

	return (
		<Card className="w-full">
			<CardHeader>
				<CardTitle>Welcome aboard!</CardTitle>
				<CardDescription>
					Enter your name, then confirm in your wallet to register your keys.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid grid-cols-2 gap-4">
					<div className="flex flex-col gap-2">
						<Label>First Name</Label>
						<Input
							value={firstName}
							onChange={(e) => setFirstName(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder="John"
							autoFocus
						/>
					</div>
					<div className="flex flex-col gap-2">
						<Label>Last Name</Label>
						<Input
							value={lastName}
							onChange={(e) => setLastName(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder="Doe"
						/>
					</div>
				</div>
				<Button
					type="button"
					onClick={submit}
					disabled={!firstName.trim() || disabled}
					className="w-full group"
					variant="primary"
				>
					{disabled ? "Registering…" : "Continue"}
					{!disabled ? (
						<CaretRightIcon
							className="transition-transform duration-200 size-4 group-hover:translate-x-1"
							weight="bold"
						/>
					) : null}
				</Button>
			</CardContent>
		</Card>
	);
}
