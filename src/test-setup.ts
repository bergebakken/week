/**
 * Node 25 defines a global `localStorage` that is inert unless the process was
 * started with --localstorage-file, and it shadows the one happy-dom installs.
 * Swap in a working in-memory Storage so the app's persistence can be tested.
 */
function memoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() { return map.size },
    clear: () => { map.clear() },
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    removeItem: (key: string) => { map.delete(key) },
    setItem: (key: string, value: string) => { map.set(key, String(value)) },
  } as Storage
}

const storage = memoryStorage()
for (const target of new Set<object>([globalThis, typeof window === 'undefined' ? globalThis : window])) {
  Object.defineProperty(target, 'localStorage', { value: storage, configurable: true, writable: true })
}
