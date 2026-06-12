import { useEffect, useRef } from "react";
import { Input } from "@/src/lib/components/ui/input";
import { cn } from "@/src/lib/utils";

interface OtpInputProps {
	value: string;
	onChange: (value: string) => void;
	length?: number;
	className?: string;
	disabled?: boolean;
	autoFocus?: boolean;
	onSubmit?: () => void;
	id?: string;
}

export function OtpInput({
	value,
	onChange,
	length = 6,
	className,
	disabled = false,
	autoFocus = false,
	onSubmit,
	id,
}: OtpInputProps) {
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (!autoFocus) return;
		const frame = window.requestAnimationFrame(() => {
			inputRef.current?.focus();
		});
		return () => window.cancelAnimationFrame(frame);
	}, [autoFocus]);

	const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const digit = event.target.value.replace(/\D/g, "");
		onChange(digit.slice(0, length));
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Enter" && onSubmit) {
			event.preventDefault();
			onSubmit();
		}
	};

	return (
		<Input
			ref={inputRef}
			id={id}
			type="text"
			inputMode="numeric"
			pattern="[0-9]*"
			autoComplete="one-time-code"
			value={value}
			onChange={handleInputChange}
			onKeyDown={handleKeyDown}
			disabled={disabled}
			maxLength={length}
			placeholder="••••••"
			variant="field"
			className={cn(
				"h-14 text-center font-mono text-lg tracking-[0.3em] md:text-xl",
				value && "border-primary/50 bg-primary/5",
				className,
			)}
		/>
	);
}
