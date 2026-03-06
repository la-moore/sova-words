export class Cache {
    static enabled: boolean = false;
    private static files: Record<string, unknown> = {};

    static add(key: string, file: unknown): void {
        if (!Cache.enabled) return;

        // Optional: uncomment for debugging
        // console.log('Cache', 'Adding key:', key);

        Cache.files[key] = file;
    }

    static get(key: string): unknown | undefined {
        if (!Cache.enabled) return undefined;

        // Optional: uncomment for debugging
        // console.log('Cache', 'Checking key:', key);

        return Cache.files[key];
    }

    static remove(key: string): void {
        delete Cache.files[key];
    }

    static clear(): void {
        Cache.files = {};
    }

    static has(key: string): boolean {
        if (!Cache.enabled) return false;
        return key in Cache.files;
    }
}
