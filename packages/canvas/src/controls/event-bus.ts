export class EventBus<Events extends Record<PropertyKey, any[]>> {
    private listeners: {
        [K in keyof Events]?: Set<(...args: Events[K]) => void>
    } = {}

    on<K extends keyof Events>(
        type: K,
        listener: (...args: Events[K]) => void
    ) {
        if (!this.listeners[type]) {
            this.listeners[type] = new Set()
        }
        this.listeners[type]!.add(listener)
    }

    once<K extends keyof Events>(
        type: K,
        listener: (...args: Events[K]) => void
    ) {
        const wrapper = (...args: Events[K]) => {
            this.off(type, wrapper)
            listener(...args)
        }
        this.on(type, wrapper)
    }

    off<K extends keyof Events>(
        type: K,
        listener: (...args: Events[K]) => void
    ) {
        this.listeners[type]?.delete(listener)
    }

    emit<K extends keyof Events>(
        type: K,
        ...args: Events[K]
    ) {
        this.listeners[type]?.forEach(l => l(...args))
    }

    clear<K extends keyof Events>(type?: K) {
        if (type) {
            this.listeners[type]?.clear()
        } else {
            this.listeners = {}
        }
    }
}
