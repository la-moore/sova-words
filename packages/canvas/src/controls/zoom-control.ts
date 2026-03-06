import { Viewport, Node } from "@pixme/canvas"
import { EventBus } from "./event-bus"

export class ZoomControl extends EventBus<{
    zoom: [number]
}> {
    domElement: HTMLCanvasElement
    viewport: Viewport
    node: Node

    zoom = 1
    pixelRatio: number
    zoomSensitivity: number
    minZoom: number
    maxZoom: number

    constructor(node: Node, viewport: Viewport, domElement: HTMLCanvasElement) {
        super()
        this.domElement = domElement
        this.viewport = viewport
        this.node = node

        this.pixelRatio = window.devicePixelRatio

        this.zoomSensitivity = 0.005
        this.minZoom = 0.1
        this.maxZoom = 1.2

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

        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * zoomFactor))

        if (x === undefined || y === undefined) {
            const bounds = this.domElement.getBoundingClientRect()
            x = (bounds.width / 2) * this.pixelRatio
            y = (bounds.height / 2) * this.pixelRatio
        }

        const relativeX = (x + this.viewport.position.x) / this.viewport.getScale()
        const relativeY = (y + this.viewport.position.y) / this.viewport.getScale()

        this.zoom = newZoom

        const bounds = this.node.getBounds()
        const fitScale = Math.min(this.domElement.width / bounds.width, this.domElement.height / bounds.height)

        this.viewport.scale = fitScale * newZoom
        this.viewport.position.x = (relativeX * this.viewport.getScale()) - x
        this.viewport.position.y = (relativeY * this.viewport.getScale()) - y

        this.emit('zoom', this.zoom)
    }

    fit(factor = 1) {
        const bounds = this.node.getBounds()
        const fitScale = Math.min(this.domElement.width / bounds.width, this.domElement.height / bounds.height)

        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, factor))

        this.viewport.scale = fitScale * newZoom
        this.zoom = newZoom

        this.emit('zoom', this.zoom)
    }

    fill(factor = 1) {
        const bounds = this.node.getBounds()
        const baseFitScale = Math.min(this.domElement.width / bounds.width, this.domElement.height / bounds.height)
        const baseFillScale = Math.max(this.domElement.width / bounds.width, this.domElement.height / bounds.height)

        const fillZoom = (baseFillScale / baseFitScale) * factor
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, fillZoom))

        this.viewport.scale = baseFitScale * newZoom
        this.zoom = newZoom

        this.emit('zoom', this.zoom)
    }
}
