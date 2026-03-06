import type { Loader } from './loader'

type OnStartCallback = (url: string, loaded: number, total: number) => void
type OnLoadCallback = () => void
type OnProgressCallback = (url: string, loaded: number, total: number) => void
type OnErrorCallback = (url: string) => void
type UrlModifier = (url: string) => string

export class LoadingManager {
    onStart?: OnStartCallback;
    onLoad?: OnLoadCallback;
    onProgress?: OnProgressCallback;
    onError?: OnErrorCallback;

    private _abortController: AbortController | null = null;

    private isLoading = false;
    private itemsLoaded = 0;
    private itemsTotal = 0;
    private urlModifier?: UrlModifier;
    private handlers: Array<RegExp | Loader> = [];

    constructor(
        onLoad?: OnLoadCallback,
        onProgress?: OnProgressCallback,
        onError?: OnErrorCallback
    ) {
        this.onLoad = onLoad;
        this.onProgress = onProgress;
        this.onError = onError;
    }

    itemStart(url: string): void {
        this.itemsTotal++;

        if (!this.isLoading) {
            if (this.onStart) {
                this.onStart(url, this.itemsLoaded, this.itemsTotal);
            }
            this.isLoading = true;
        }
    }

    itemEnd(url: string): void {
        this.itemsLoaded++;

        if (this.onProgress) {
            this.onProgress(url, this.itemsLoaded, this.itemsTotal);
        }

        if (this.itemsLoaded === this.itemsTotal) {
            this.isLoading = false;
            if (this.onLoad) {
                this.onLoad();
            }
        }
    }

    itemError(url: string): void {
        if (this.onError) {
            this.onError(url);
        }
    }

    resolveURL(url: string): string {
        return this.urlModifier ? this.urlModifier(url) : url;
    }

    setURLModifier(transform: UrlModifier | null): this {
        this.urlModifier = transform ?? undefined;
        return this;
    }

    addHandler(regex: RegExp, loader: Loader): this {
        this.handlers.push(regex, loader);
        return this;
    }

    removeHandler(regex: RegExp): this {
        const index = this.handlers.indexOf(regex);
        if (index !== -1) {
            this.handlers.splice(index, 2);
        }
        return this;
    }

    getHandler(file: string): Loader | null {
        for (let i = 0; i < this.handlers.length; i += 2) {
            const regex = this.handlers[i] as RegExp;
            const loader = this.handlers[i + 1] as Loader;

            // Reset lastIndex in case the regex is global
            if (regex.global) regex.lastIndex = 0;

            if (regex.test(file)) {
                return loader;
            }
        }
        return null;
    }

    abort(): this {
        if (this.abortController) {
            this.abortController.abort();
            this._abortController = null;
        }
        return this;
    }

    get abortController(): AbortController {
        if (!this._abortController) {
            this._abortController = new AbortController();
        }
        return this._abortController;
    }
}
