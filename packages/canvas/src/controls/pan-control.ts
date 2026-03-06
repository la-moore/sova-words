import { Node, Vector, Viewport } from "@pixme/canvas"
import { EventBus } from "./event-bus"

export class PanControl extends EventBus<{
    pan: [{ x: number, y: number }]
}> {
    domElement: HTMLCanvasElement
    viewport: Viewport
    pixelRatio: number

    isPanning = false
    pointerStart = new Vector()
    viewportStart = new Vector()

    constructor(viewport: Viewport, domElement: HTMLCanvasElement) {
        super()

        this.domElement = domElement
        this.viewport = viewport
        this.pixelRatio = window.devicePixelRatio

        this.domElement.addEventListener('wheel', this.onWheel.bind(this))
        this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this))
        this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this))
        this.domElement.addEventListener('mouseup', this.onMouseUp.bind(this))
    }

    private onMouseDown(ev: MouseEvent) {
        if (ev.button === 1) {
            this.pointerStart.x = ev.clientX
            this.pointerStart.y = ev.clientY

            this.viewportStart.x = this.viewport.position.x
            this.viewportStart.y = this.viewport.position.y

            this.isPanning = true
        }
    }

    private onMouseMove(ev: MouseEvent) {
        if (this.isPanning) {
            const current = new Vector(ev.clientX, ev.clientY)
            const delta = current
                .sub(this.pointerStart)
                .scale(new Vector(0.8, 0.8))

            this.viewport.position.x = this.viewportStart.x - delta.x * this.pixelRatio
            this.viewport.position.y = this.viewportStart.y - delta.y * this.pixelRatio

            this.emit('pan', this.viewport.position.toArray())
        }
    }

    private onMouseUp(ev: MouseEvent) {
        if (ev.button === 1) {
            this.isPanning = false
        }
    }

    private onWheel(e: WheelEvent) {
        if (!e.ctrlKey) {
            e.preventDefault()
            this.viewport.position.x += (e.deltaX) * this.pixelRatio
            this.viewport.position.y += (e.deltaY) * this.pixelRatio
            this.emit('pan', this.viewport.position.toArray())
        }

        if (e.shiftKey) {
            e.preventDefault()
            this.viewport.position.x += (e.deltaX) * this.pixelRatio
            this.emit('pan', this.viewport.position.toArray())
        }
    }

    centerToNode(node: Node) {
        const bounds = node.getBounds()
        const viewport = this.viewport

        const center = new Vector(this.domElement.width / 2, this.domElement.height / 2)
            .sub(new Vector((bounds.width * viewport.scale) / 2, (bounds.height * viewport.scale) / 2))

        viewport.moveTo(-Math.round(center.x), -Math.round(center.y))

        this.emit('pan', this.viewport.position.toArray())
    }
}
