import { Vector } from "./vector"
import { Box } from "./box"
import { Renderer, Viewport } from "./render"

export class Node {
    position = new Vector()
    size = new Vector()
    scale = new Vector(1, 1)
    visible = true
    opacity = 1
    blend: GlobalCompositeOperation = 'source-over'

    parent?: Container

    getBounds() {
        return new Box(
            this.position.x,
            this.position.y,
            this.size.x * this.scale.x,
            this.size.y * this.scale.y
        )
    }

    traverseBubble(callback: (node: Node | Container) => void) {
        let current: Node | Container | undefined = this.parent

        while (current) {
            callback(current)
            current = current.parent
        }
    }

    render(ctx: CanvasRenderingContext2D, viewport: Viewport, renderer: Renderer) {}

    getChildren(): Node[] {
        return []
    }

    traverse(result: Node[] = []): Node[] {
        return result
    }
}

export class Container extends Node {
    children: Node[] = []

    add<T extends Node>(child: T) {
        this.children.push(child)
        child.parent = this

        return child
    }

    prepend<T extends Node>(child: T) {
        this.children.unshift(child)
        child.parent = this

        return child
    }

    traverse(result: Node[] = []) {
        for (const child of this.getChildren()) {
            if (!child.visible) continue

            result.push(child)
            child.traverse(result)
        }

        return result
    }

    getChildren() {
        return this.children
    }
}
