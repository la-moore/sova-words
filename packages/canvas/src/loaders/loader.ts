import { LoadingManager } from './loading-manager';

export type OnProgressCallback = (event: ProgressEvent) => void;
export type OnErrorCallback = (error: ErrorEvent | string) => void;
export type OnLoadCallback<T = any> = (result: T) => void;

export class Loader {
    manager: LoadingManager;
    crossOrigin: string = 'anonymous';
    withCredentials: boolean = false;
    path: string = '';
    resourcePath: string = '';
    requestHeader: Record<string, string> = {};

    constructor(manager?: LoadingManager) {
        this.manager = manager || new LoadingManager();
    }

    load(
        url: string,
        onLoad: OnLoadCallback,
        onProgress?: OnProgressCallback,
        onError?: OnErrorCallback
    ) {}

    loadAsync<T = any>(
        url: string,
        onProgress?: OnProgressCallback
    ): Promise<T> {
        return new Promise((resolve, reject) => {
            this.load(url, resolve, onProgress, reject);
        });
    }

    parse(data: unknown) {}

    setCrossOrigin(crossOrigin: string): this {
        this.crossOrigin = crossOrigin;
        return this;
    }

    setWithCredentials(value: boolean): this {
        this.withCredentials = value;
        return this;
    }

    setPath(path: string): this {
        this.path = path;
        return this;
    }

    setResourcePath(resourcePath: string): this {
        this.resourcePath = resourcePath;
        return this;
    }

    setRequestHeader(requestHeader: Record<string, string>): this {
        this.requestHeader = requestHeader;
        return this;
    }

    abort(): this {
        return this;
    }
}
