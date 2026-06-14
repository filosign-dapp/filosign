import { toast } from "sonner";

type ToastHintOptions = {
	hint?: string;
	id?: string;
	duration?: number;
};

function withHint(title: string, options?: ToastHintOptions) {
	const hint = options?.hint?.trim();
	return {
		title,
		...(hint ? { description: hint } : {}),
		id: options?.id,
		duration: options?.duration,
	};
}

export const toastUser = {
	success(title: string, options?: ToastHintOptions) {
		const payload = withHint(title, options);
		toast.success(payload.title, {
			...(payload.description ? { description: payload.description } : {}),
			...(payload.id ? { id: payload.id } : {}),
			...(payload.duration ? { duration: payload.duration } : {}),
		});
	},
	error(title: string, options?: ToastHintOptions) {
		const payload = withHint(title, options);
		toast.error(payload.title, {
			...(payload.description ? { description: payload.description } : {}),
			...(payload.id ? { id: payload.id } : {}),
			duration: options?.duration ?? 8000,
		});
	},
	message(title: string, options?: ToastHintOptions) {
		const payload = withHint(title, options);
		toast.message(payload.title, {
			...(payload.description ? { description: payload.description } : {}),
			...(payload.id ? { id: payload.id } : {}),
			...(payload.duration ? { duration: payload.duration } : {}),
		});
	},
	info(title: string, options?: ToastHintOptions) {
		const payload = withHint(title, options);
		toast.info(payload.title, {
			...(payload.description ? { description: payload.description } : {}),
			...(payload.id ? { id: payload.id } : {}),
			...(payload.duration ? { duration: payload.duration } : {}),
		});
	},
	warning(title: string, options?: ToastHintOptions) {
		const payload = withHint(title, options);
		toast.warning(payload.title, {
			...(payload.description ? { description: payload.description } : {}),
			...(payload.id ? { id: payload.id } : {}),
			duration: options?.duration ?? 8000,
		});
	},
};
