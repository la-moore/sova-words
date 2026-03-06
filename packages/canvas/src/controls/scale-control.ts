import { Viewport, Node } from "@pixme/canvas"
import { EventBus } from "./event-bus"

export class ScaleControl extends EventBus<{
    scale: [number]
}> {
    domElement: HTMLCanvasElement
    viewport: Viewport

    zoom = 0
    pixelRatio: number
    zoomSensitivity: number
    minScale: number
    maxScale: number

    constructor(viewport: Viewport, domElement: HTMLCanvasElement) {
        super()
        this.domElement = domElement
        this.viewport = viewport
        this.pixelRatio = window.devicePixelRatio

        this.zoomSensitivity = 0.005
        this.minScale = 4
        this.maxScale = 100

        this.domElement.addEventListener('wheel', this.onWheel.bind(this))
    }

    private onWheel(e: WheelEvent) {
        if (e.ctrlKey) {
            e.preventDefault()

            const bounds = this.domElement.getBoundingClientRect()
            const mouseX = (e.clientX - bounds.left) * this.pixelRatio
            const mouseY = (e.clientY - bounds.top) * this.pixelRatio

            this.zoomBy(-e.deltaY, mouseX, mouseY)
        }
    }

    zoomBy(delta: number, x?: number, y?: number) {
        const zoomDelta = Math.ceil(delta) * this.zoomSensitivity
        const zoomFactor = Math.exp(zoomDelta)
        const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.viewport.scale * zoomFactor))

        if (x === undefined || y === undefined) {
            const bounds = this.domElement.getBoundingClientRect()
            x = (bounds.width / 2) * this.pixelRatio
            y = (bounds.height / 2) * this.pixelRatio
        }

        const relativeX = (x - this.viewport.position.x) / this.viewport.getScale()
        const relativeY = (y - this.viewport.position.y) / this.viewport.getScale()

        this.viewport.scale = newScale

        this.viewport.position.x = x - relativeX * this.viewport.getScale()
        this.viewport.position.y = y - relativeY * this.viewport.getScale()

        this.emit('scale', this.viewport.scale)
    }

    fitToNode(node: Node, factor = 1) {
        const bounds = node.getBounds()
        const fitScale = Math.min(this.domElement.width / bounds.width, this.domElement.height / bounds.height)

        this.viewport.scale = Math.round(fitScale * factor)

        this.emit('scale', this.viewport.scale)
    }
}
