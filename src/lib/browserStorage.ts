const createMemoryStorage = (): Storage => {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(String(key), String(value));
    },
  } as Storage;
};

const memoryLocalStorage = createMemoryStorage();
const memorySessionStorage = createMemoryStorage();

const getBrowserStorage = (type: "localStorage" | "sessionStorage") => {
  try {
    if (typeof window === "undefined") return undefined;
    return window[type];
  } catch {
    return undefined;
  }
};

const canUseStorage = (storage: Storage | undefined) => {
  try {
    if (!storage) return false;
    const testKey = "__fomo_storage_test__";
    storage.setItem(testKey, "1");
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

export const safeLocalStorage = canUseStorage(getBrowserStorage("localStorage"))
  ? (getBrowserStorage("localStorage") as Storage)
  : memoryLocalStorage;

export const safeSessionStorage = canUseStorage(getBrowserStorage("sessionStorage"))
  ? (getBrowserStorage("sessionStorage") as Storage)
  : memorySessionStorage;

export const installSafeBrowserStorage = () => {
  if (typeof window === "undefined") return;

  try {
    Object.defineProperty(window, "localStorage", {
      value: safeLocalStorage,
      configurable: true,
    });
  } catch {
    // Ignore - fallback helpers still work even if the browser blocks reassignment.
  }

  try {
    Object.defineProperty(window, "sessionStorage", {
      value: safeSessionStorage,
      configurable: true,
    });
  } catch {
    // Ignore - fallback helpers still work even if the browser blocks reassignment.
  }
};