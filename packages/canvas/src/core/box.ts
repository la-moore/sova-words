import { Vector } from "./vector"

export class Box extends Vector {
    private _w = 0
    private _h = 0

    constructor(x = 0, y = 0, width = 0, height = 0) {
        super(x, y)
        this._w = width
        this._h = height
    }


    get width(): number {
        return this._w
    }

    set width(value: number) {
        if (this._w === value) return
        this._w = value
        this.handleChange()
    }

    get height(): number {
        return this._h
    }

    set height(value: number) {
        if (this._h === value) return
        this._h = value
        this.handleChange()
    }


    clone() {
        return new Box(this.x, this.y, this.width, this.height)
    }

    includes(v: Vector) {
        return v.x >= this.x && v.x < this.width && v.y >= this.y && v.y < this.height
    }

    clamp(box: Box) {
        this.x = Math.max(box.x, Math.min(this.x, box.width))
        this.y = Math.max(box.y, Math.min(this.y, box.height))
        this.width = Math.max(box.x, Math.min(this.width, box.width))
        this.height = Math.max(box.y, Math.min(this.height, box.height))

        if (this.x > this.width) {
            const tmp = this.x
            this.x = this.width
            this.width = tmp
        }

        if (this.y > this.height) {
            const tmp = this.y
            this.y = this.height
            this.height = tmp
        }

        return this
    }

    toArray() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        }
    }
}
