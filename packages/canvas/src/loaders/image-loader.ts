import { Cache } from './cache';
import { Loader, OnLoadCallback, OnProgressCallback, OnErrorCallback } from './loader';
import { LoadingManager } from "./loading-manager";

// const cache = new Cache();
const _loading = new WeakMap<HTMLImageElement, Array<{ onLoad?: OnLoadCallback<HTMLImageElement>; onError?: OnErrorCallback }>>();

export class ImageLoader extends Loader {
    constructor(manager?: LoadingManager) {
        super(manager);
    }

    load(
        url: string,
        onLoad: OnLoadCallback<HTMLImageElement>,
        onProgress?: OnProgressCallback,
        onError?: OnErrorCallback
    ): HTMLImageElement {
        if (this.path) {
            url = this.path + url;
        }

        url = this.manager.resolveURL(url);

        const cacheKey = `image:${url}`;
        const cached = Cache.get(cacheKey) as HTMLImageElement | undefined;

        if (cached !== undefined) {
            if (cached.complete && cached.naturalWidth !== 0) {
                this.manager.itemStart(url);

                setTimeout(() => {
                    onLoad?.(cached);
                    this.manager.itemEnd(url);
                }, 0);

                return cached;
            }

            let callbacks = _loading.get(cached);
            if (!callbacks) {
                callbacks = [];
                _loading.set(cached, callbacks);
            }

            callbacks.push({ onLoad, onError });
            return cached;
        }

        const image = new Image();

        const onImageLoad = () => {
            removeEventListeners();

            onLoad?.(image);

            const callbacks = _loading.get(image) || [];
            for (const cb of callbacks) {
                cb.onLoad?.(image);
            }
            _loading.delete(image);

            this.manager.itemEnd(url);
        };

        const onImageError = (event: ErrorEvent) => {
            removeEventListeners();

            onError?.(event);

            const callbacks = _loading.get(image) || [];
            for (const cb of callbacks) {
                cb.onError?.(event);
            }
            _loading.delete(image);

            Cache.remove(cacheKey);
            this.manager.itemError(url);
            this.manager.itemEnd(url);
        };

        const removeEventListeners = () => {
            image.removeEventListener('load', onImageLoad);
            image.removeEventListener('error', onImageError);
        };

        image.addEventListener('load', onImageLoad);
        image.addEventListener('error', onImageError);

        if (!url.startsWith('data:')) {
            if (this.crossOrigin !== undefined) {
                image.crossOrigin = this.crossOrigin;
            }
            if (this.withCredentials) {
                image.crossOrigin = 'use-credentials';
            }
        }

        Cache.add(cacheKey, image);
        this.manager.itemStart(url);

        image.src = url;

        return image;
    }

    abort(): this {
        return this;
    }
}
