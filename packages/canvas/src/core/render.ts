import { Vector } from './vector'
import { Node, Container } from './node'
import { Scene } from './scene'

export class Viewport {
    position: Vector
    size: Vector
    scale: number

    constructor() {
        this.position = new Vector()
        this.size = new Vector()
        this.scale = 1
    }

    getBounds() {
        return {
            x: this.position.x,
            y: this.position.y,
            width: this.size.x,
            height: this.size.y
        }
    }

    setSize(width: number, height: number) {
        this.size.set(width, height)
    }

    moveTo(x: number, y: number) {
        this.position.x = x
        this.position.y = y
    }

    move(x: number, y: number) {
        this.position.x += x
        this.position.y += y
    }

    zoom(s: number) {
        this.scale += s
    }

    zoomTo(s: number) {
        this.scale = s
    }

    screenToWorld(x: number, y: number) {
        return new Vector(
            (x + this.position.x) / this.getScale(),
            (y + this.position.y) / this.getScale()
        )
    }

    worldToScreen(x: number, y: number) {
        return new Vector(
            x * this.getScale() + this.position.x,
            y * this.getScale() + this.position.y
        )
    }

    getScale() {
        return this.scale
    }

    fitToNode(node: Node, renderer: Renderer, factor = 1) {
        const bounds = node.getBounds()
        const rw = renderer.domElement.width / renderer.pixelRatio
        const rh = renderer.domElement.height / renderer.pixelRatio
        const fitScale = Math.min(rw / bounds.width, rh / bounds.height)

        this.scale = fitScale * factor
    }

    fillToNode(node: Node, renderer: Renderer, factor = 1) {
        const bounds = node.getBounds()
        const rw = renderer.domElement.width / renderer.pixelRatio
        const rh = renderer.domElement.height / renderer.pixelRatio
        const fillScale = Math.max(rw / bounds.width, rh / bounds.height)

        this.scale = fillScale * factor
    }

    centerToNode(node: Node, renderer: Renderer) {
        const bounds = node.getBounds()
        const rw = renderer.domElement.width / renderer.pixelRatio
        const rh = renderer.domElement.height / renderer.pixelRatio
        const center = new Vector(
            rw / 2 - (bounds.width * this.getScale()) / 2,
            rh / 2 - (bounds.height * this.getScale()) / 2
        )

        this.position.set(-center.round().x, -center.round().y)
    }
}

export class Renderer {
    domElement: HTMLCanvasElement
    ctx: CanvasRenderingContext2D
    pixelRatio: number

    constructor() {
        this.domElement = document.createElement('canvas')
        this.ctx = this.domElement.getContext('2d')!
        this.pixelRatio = window.devicePixelRatio

        this.domElement.style.imageRendering = 'pixelated'
        this.domElement.style.imageRendering = 'crisp-edges'

        this.domElement.style.width = `100%`
        this.domElement.style.height = `100%`
    }

    setSize(width: number, height: number) {
        // this.ctx.canvas
        this.domElement.width = width * this.pixelRatio
        this.domElement.height = height * this.pixelRatio
    }

    clear() {
        this.ctx.clearRect(0, 0, this.domElement.width, this.domElement.height)
    }

    render(scene: Scene, viewport: Viewport) {
        this.clear()

        this.ctx.save()

        if (scene.background) {
            this.ctx.fillStyle = scene.background.toHex()
            this.ctx.fillRect(0, 0, this.domElement.width, this.domElement.height)
        }

        this.ctx.imageSmoothingEnabled = false
        this.ctx.translate(-viewport.position.x, -viewport.position.y)
        this.ctx.scale(viewport.scale, viewport.scale)

        this.renderTraverse(scene, viewport)

        this.ctx.restore()
    }

    renderTraverse(node: Node | Container, viewport: Viewport, ctx?: CanvasRenderingContext2D) {
        if (!node.visible) return

        if (!ctx) {
            ctx = this.ctx
        }

        ctx.save()

        const tx = node.position.x
        const ty = node.position.y
        ctx.translate(tx, ty)

        const scaleX = node.scale.x
        const scaleY = node.scale.y
        ctx.scale(scaleX, scaleY)

        ctx.globalAlpha = node.opacity
        ctx.globalCompositeOperation = node.blend

        node.render(ctx, viewport, this)

        if (node instanceof Container) {
            node.getChildren().forEach((child) => {
                this.renderTraverse(child, viewport)
            })
        }

        ctx.restore()
    }

    drawImage(image: CanvasImageSource, x = 0, y = 0) {
        this.ctx.save()
        // this.ctx.globalCompositeOperation = 'multiply'
        // this.ctx.globalAlpha = layer.opacity
        this.ctx.drawImage(image, x, y)
        this.ctx.restore()
    }

    toDataUrl(type = 'image/png', quality = 1) {
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = this.domElement.width / this.pixelRatio
        exportCanvas.height = this.domElement.height / this.pixelRatio

        const ctx = exportCanvas.getContext('2d')!

        ctx.imageSmoothingEnabled = false

        ctx.drawImage(
            this.domElement,
            0, 0, this.domElement.width, this.domElement.height,
            0, 0, exportCanvas.width, exportCanvas.height
        );

        return exportCanvas.toDataURL(type, quality)
    }
}
