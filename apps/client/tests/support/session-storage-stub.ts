/** Restorable sessionStorage for browser session helpers in unit tests. */
export function withSessionStorageStub(
	run: (storage: Map<string, string>) => void,
) {
	const store = new Map<string, string>();
	const descriptor = Object.getOwnPropertyDescriptor(
		globalThis,
		"sessionStorage",
	);

	Object.defineProperty(globalThis, "sessionStorage", {
		value: {
			getItem: (key: string) => store.get(key) ?? null,
			setItem: (key: string, value: string) => {
				store.set(key, value);
			},
			removeItem: (key: string) => {
				store.delete(key);
			},
		},
		configurable: true,
		writable: true,
	});

	try {
		run(store);
	} finally {
		if (descriptor) {
			Object.defineProperty(globalThis, "sessionStorage", descriptor);
		} else {
			Reflect.deleteProperty(globalThis, "sessionStorage");
		}
	}
}
