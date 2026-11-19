import { effectScope, reactive, type UnwrapNestedRefs } from 'vue'

/**
 * A minimal store: `setup` runs once, on first use, in a detached effect scope, so its computeds and
 * watchers outlive the component that first asked for it. The result is reactive, like a Pinia store:
 * refs unwrap on access (`store.sound`), and `toRefs(store)` destructures it without losing reactivity.
 */
export function defineStore<T extends object>(setup: () => T): () => UnwrapNestedRefs<T> {
  let store: UnwrapNestedRefs<T> | undefined
  return () => {
    store ??= effectScope(true).run(() => reactive(setup()))!
    return store
  }
}
