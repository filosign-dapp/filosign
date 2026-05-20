import * as React from "react";
import {
	Controller,
	type ControllerProps,
	type FieldError,
	type FieldPath,
	type FieldValues,
	FormProvider,
	useFormContext,
} from "react-hook-form";

import { cn } from "@/src/lib/utils";
import { Label } from "./label";

const Form = FormProvider;

type FormFieldContextValue<
	TFieldValues extends FieldValues = FieldValues,
	TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
	name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>(
	{} as FormFieldContextValue,
);

const FormField = <
	TFieldValues extends FieldValues = FieldValues,
	TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
	...props
}: ControllerProps<TFieldValues, TName>) => {
	return (
		<FormFieldContext.Provider value={{ name: props.name }}>
			<Controller {...props} />
		</FormFieldContext.Provider>
	);
};

const useFormField = () => {
	const fieldContext = React.useContext(FormFieldContext);
	const itemContext = React.useContext(FormItemContext);
	const { getFieldState, formState } = useFormContext();

	if (!fieldContext) {
		throw new Error("useFormField should be used within <FormField>");
	}

	const { id } = itemContext;
	const fieldState = getFieldState(fieldContext.name, formState);

	return {
		id,
		name: fieldContext.name,
		formItemId: `${id}-form-item`,
		formDescriptionId: `${id}-form-item-description`,
		formMessageId: `${id}-form-item-message`,
		...fieldState,
	};
};

type FormItemContextValue = {
	id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>(
	{} as FormItemContextValue,
);

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
	const id = React.useId();

	return (
		<FormItemContext.Provider value={{ id }}>
			<div
				data-slot="form-item"
				className={cn("grid gap-2", className)}
				{...props}
			/>
		</FormItemContext.Provider>
	);
}

function FormLabel({ className, ...props }: React.ComponentProps<"label">) {
	const { error, formItemId } = useFormField();

	return (
		<Label
			data-slot="form-label"
			data-error={!!error}
			className={cn("data-[error=true]:text-destructive", className)}
			htmlFor={formItemId}
			{...props}
		/>
	);
}

function FormControl({
	children,
	...props
}: React.HTMLAttributes<HTMLElement> & { children: React.ReactElement }) {
	const { error, formItemId, formDescriptionId, formMessageId } =
		useFormField();

	return React.cloneElement(
		children as React.ReactElement<Record<string, unknown>>,
		{
			"data-slot": "form-control",
			id: formItemId,
			"aria-describedby": !error
				? `${formDescriptionId}`
				: `${formDescriptionId} ${formMessageId}`,
			"aria-invalid": !!error,
			...props,
		},
	);
}

function FormDescription({ className, ...props }: React.ComponentProps<"p">) {
	const { formDescriptionId } = useFormField();

	return (
		<p
			data-slot="form-description"
			id={formDescriptionId}
			className={cn("text-muted-foreground text-sm", className)}
			{...props}
		/>
	);
}

function getErrorMessage(error: FieldError | undefined): string | undefined {
	if (!error) return undefined;
	if (error.message) return String(error.message);
	if (error.type) {
		const typeMessages: Record<string, string> = {
			required: "This field is required",
			min: "Value is too small",
			max: "Value is too large",
			minLength: "Input is too short",
			maxLength: "Input is too long",
			pattern: "Invalid format",
			validate: "Validation failed",
		};
		return typeMessages[error.type] || `Error: ${error.type}`;
	}
	return undefined;
}

function FormMessage({ className, ...props }: React.ComponentProps<"p">) {
	const { error, formMessageId } = useFormField();
	const message = getErrorMessage(error);

	if (!message) {
		return null;
	}

	return (
		<p
			data-slot="form-message"
			id={formMessageId}
			className={cn("text-destructive text-sm font-medium", className)}
			{...props}
		>
			{message}
		</p>
	);
}

export {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	useFormField,
};
