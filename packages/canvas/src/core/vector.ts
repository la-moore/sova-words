export class Vector {
    private _x = 0
    private _y = 0

    protected listeners: (() => void)[] = []

    constructor(x = 0, y = 0) {
        this._x = x
        this._y = y
    }


    get x(): number {
        return this._x
    }

    set x(value: number) {
        if (this._x === value) return
        this._x = value
        this.handleChange()
    }

    get y(): number {
        return this._y
    }

    set y(value: number) {
        if (this._y === value) return
        this._y = value
        this.handleChange()
    }

    protected handleChange(): void {
        for (const listener of this.listeners) {
            listener()
        }
    }

    onChange(callback: () => void): void {
        this.listeners.push(callback)
    }


    set(x: number, y: number) {
        this.x = x
        this.y = y

        return this
    }

    sub(v: Vector) {
        this.x -= v.x
        this.y -= v.y

        return this
    }

    add(v: Vector) {
        this.x += v.x
        this.y += v.y

        return this
    }

    scale(v: Vector) {
        this.x *= v.x
        this.y *= v.y

        return this
    }

    divide(v: Vector) {
        this.x /= v.x
        this.y /= v.y

        return this
    }

    equal(v: Vector) {
        return this.x === v.x && this.y === v.y
    }

    round() {
        this.x = Math.round(this.x)
        this.y = Math.round(this.y)

        return this
    }

    floor() {
        this.x = Math.floor(this.x)
        this.y = Math.floor(this.y)

        return this
    }

    ceil() {
        this.x = Math.ceil(this.x)
        this.y = Math.ceil(this.y)

        return this
    }

    abs() {
        this.x = Math.abs(this.x)
        this.y = Math.abs(this.y)

        return this
    }

    clone() {
        return new Vector(this.x, this.y)
    }

    copy(v: Vector) {
        this.x = v.x
        this.y = v.y

        return this
    }

    distanceTo(v: Vector) {
        return Math.sqrt(Math.pow(this.x - v.x, 2) + Math.pow(this.y - v.y, 2))
    }

    toArray() {
        return {
            x: this.x,
            y: this.y
        }
    }
}
