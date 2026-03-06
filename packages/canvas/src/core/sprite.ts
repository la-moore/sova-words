import { Node } from "./node"

export class Sprite extends Node {
    image: HTMLImageElement
    loaded: boolean

    constructor(src?: string) {
        super()

        this.loaded = false
        this.image = new Image()

        if (src) {
            this.loadImage(src)
        }
    }

    loadImage(src: string) {
        this.loaded = false

        return new Promise((resolve) => {
            this.image.src = src

            this.image.onload = () => {
                this.loaded = true
                resolve(true)
            }
        })
    }

    render(ctx: CanvasRenderingContext2D) {
        if (!this.image.src) return

        ctx.drawImage(this.image, 0, 0)
    }
}
