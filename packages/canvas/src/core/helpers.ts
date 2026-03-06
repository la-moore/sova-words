import { Color } from './color'
import { Vector } from "./vector"
import { Node } from "./node"
import { Viewport } from "./render"

export class GridHelper extends Node {
    cellSize: Vector
    color: Color

    constructor(size: Vector, color: Color = Color.black()) {
        super()

        this.color = color
        this.cellSize = size
        this.size = this.parent?.size.clone() || new Vector()
    }

    setDivisions(divisions: Vector) {
        this.cellSize = this.size.clone().divide(divisions)
    }

    localToMap(x: number, y: number) {
        return new Vector(Math.floor(x / this.cellSize.x), Math.floor(y / this.cellSize.y))
    }

    mapToLocal(x: number, y: number) {
        return new Vector(x * this.cellSize.x, y * this.cellSize.y)
    }

    render(ctx: CanvasRenderingContext2D, viewport: Viewport) {
        ctx.strokeStyle = this.color.toHex()

        const divisions = this.size.clone().divide(this.cellSize)

        for (let i = 1; i <= divisions.x - 1; i++) {
            const start = new Vector(i * this.size.x / divisions.x, 0)
            const end = new Vector(i * this.size.x / divisions.x, this.size.y)

            ctx.lineWidth = 1 / viewport.getScale() / this.scale.x
            ctx.beginPath()
            ctx.moveTo(start.x, start.y)
            ctx.lineTo(end.x, end.y)
            ctx.closePath()
            ctx.stroke()
        }

        for (let i = 1; i <= divisions.y - 1; i++) {
            const start = new Vector(0, i * this.size.y / divisions.y)
            const end = new Vector(this.size.x, i * this.size.y / divisions.y)

            ctx.lineWidth = 1 / viewport.getScale() / this.scale.y
            ctx.beginPath()
            ctx.moveTo(start.x, start.y)
            ctx.lineTo(end.x, end.y)
            ctx.closePath()
            ctx.stroke()
        }
    }
}

export class BoxHelper extends Node {
    color: Color

    constructor(width: number, height: number, color: Color = Color.black()) {
        super()

        this.color = color
        this.size = new Vector(width, height)
    }

    render(ctx: CanvasRenderingContext2D, viewport: Viewport) {
        ctx.strokeStyle = this.color.toHex()
        ctx.lineWidth = 1 / viewport.getScale() / this.scale.x

        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(this.size.x, 0)
        ctx.lineWidth = 1 / viewport.getScale() / this.scale.y
        ctx.lineTo(this.size.x, this.size.y)
        ctx.lineWidth = 1 / viewport.getScale() / this.scale.x
        ctx.lineTo(0, this.size.y)
        ctx.closePath()
        ctx.stroke()
    }
}
