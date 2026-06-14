const store = new Map<string, string>();

export function installLocalStorageMock(): void {
	store.clear();
	const storage = {
		get length() {
			return store.size;
		},
		clear() {
			store.clear();
		},
		getItem(key: string) {
			return store.get(key) ?? null;
		},
		key(index: number) {
			return [...store.keys()][index] ?? null;
		},
		removeItem(key: string) {
			store.delete(key);
		},
		setItem(key: string, value: string) {
			store.set(key, value);
		},
	} as Storage;

	globalThis.localStorage = storage;
	globalThis.window = globalThis as typeof globalThis & Window;
}

export function clearLocalStorageMock(): void {
	store.clear();
}
