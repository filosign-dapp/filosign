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
}

export default function OtpInput({
	value,
	onChange,
	length = 10,
	className,
	disabled = false,
	autoFocus = false,
	onSubmit,
}: OtpInputProps) {
	const inputRef = useRef<HTMLInputElement>(null);

	// Auto-focus input
	useEffect(() => {
		if (autoFocus && inputRef.current) {
			inputRef.current.focus();
		}
	}, [autoFocus]);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		// Only allow digits
		const digit = e.target.value.replace(/\D/g, "");
		const finalValue = digit.slice(0, length);
		onChange(finalValue);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && onSubmit) {
			e.preventDefault();
			onSubmit();
		}
	};

	return (
		<div className={cn("flex justify-center w-full min-w-sm", className)}>
			<Input
				ref={inputRef}
				type="text"
				inputMode="numeric"
				pattern="[0-9]*"
				autoComplete="one-time-code"
				value={value}
				onChange={handleInputChange}
				onKeyDown={handleKeyDown}
				disabled={disabled}
				className={cn(
					"w-full h-14 text-center text-lg md:text-xl font-mono tracking-[0.3em] border-2 transition-all",
					value && "border-primary/50 bg-primary/2",
					disabled && "opacity-50 cursor-not-allowed",
				)}
				maxLength={length}
				placeholder="••••••"
			/>
		</div>
	);
}
