import { Vector } from "@pixme/canvas"
import { EventBus } from "./event-bus"

export class CustomPointerEvent {
    x = 0
    y = 0
    clientX = 0
    clientY = 0
    deltaX = 0
    deltaY = 0
    altKey = false
    shiftKey = false
    ctrlKey = false
    metaKey = false
    pressed = false
    button = 0
    which = 0
    buttons = 0
    pointerType = ''
    pressedButtons: number[] = []

    static fromPointerEvent(ev: PointerEvent) {
        const event = new CustomPointerEvent()

        event.clientX = ev.clientX
        event.clientY = ev.clientY
        event.altKey = ev.altKey
        event.shiftKey = ev.shiftKey
        event.ctrlKey = ev.ctrlKey
        event.metaKey = ev.metaKey
        event.button = ev.button
        event.which = ev.which
        event.buttons = ev.buttons
        event.pointerType = ev.pointerType
        event.pressed = ev.buttons > 0

        return event
    }
}

type PointerControlEvents = {
    move: [CustomPointerEvent]
    up: [CustomPointerEvent]
    down: [CustomPointerEvent]
    drag: [CustomPointerEvent]
    contextmenu: [PointerEvent]
}

export class PointerControl extends EventBus<PointerControlEvents> {
    domElement: HTMLCanvasElement
    pixelRatio: number

    isDown = false
    pressedButtons: number[] = []
    current = new Vector()
    dragStart = new Vector()
    dragEnd = new Vector()

    constructor(domElement: HTMLCanvasElement) {
        super()
        this.domElement = domElement
        this.pixelRatio = window.devicePixelRatio

        this.domElement.addEventListener('pointerdown', this.onPointerDown.bind(this))
        this.domElement.addEventListener('pointerup', this.onPointerUp.bind(this))
        this.domElement.addEventListener('pointermove', this.onPointerMove.bind(this))
    }

    private onPointerDown(e: PointerEvent) {
        const bounds = this.domElement.getBoundingClientRect()
        const event = CustomPointerEvent.fromPointerEvent(e)

        if (e.target !== this.domElement) return

        this.isDown = true
        this.current.x = (e.clientX - bounds.left) * this.pixelRatio
        this.current.y = (e.clientY - bounds.top) * this.pixelRatio
        this.dragStart.copy(this.current)
        this.dragEnd.copy(this.current)
        this.pressedButtons.push(e.button)

        event.x = this.current.x
        event.y = this.current.y
        event.pressedButtons = this.pressedButtons

        this.emit('down', event)
    }

    private onPointerUp(e: PointerEvent) {
        const event = CustomPointerEvent.fromPointerEvent(e)

        if (e.target !== this.domElement || !this.isDown) return

        this.isDown = false
        this.pressedButtons = this.pressedButtons.filter((v) => v !== e.button)

        event.x = this.current.x
        event.y = this.current.y
        event.pressedButtons = this.pressedButtons

        this.emit('up', event)
    }

    private onPointerMove(e: PointerEvent) {
        const bounds = this.domElement.getBoundingClientRect()
        const event = CustomPointerEvent.fromPointerEvent(e)

        if (e.target !== this.domElement) return

        this.current.x = (e.clientX - bounds.left) * this.pixelRatio
        this.current.y = (e.clientY - bounds.top) * this.pixelRatio

        const delta = this.current.clone().sub(this.dragStart)

        event.x = this.current.x
        event.y = this.current.y
        event.deltaX = delta.x
        event.deltaY = delta.y
        event.pressedButtons = this.pressedButtons

        this.emit('move', event)

        if (this.isDown) {
            this.dragEnd.copy(this.current)
            this.emit('drag', event)
        }
    }


    private onContextmenu(e: PointerEvent) {
        if (e.target !== this.domElement) return

        this.emit('contextmenu', e)
        e.preventDefault()
    }

    leftButtonIsPressed(oneButton = false) {
        return this.pressedButtons.includes(0) && (!oneButton || this.pressedButtons.length === 0)
    }

    middleButtonIsPressed(oneButton = false) {
        return this.pressedButtons.includes(1) && (!oneButton || this.pressedButtons.length === 0)
    }

    rightButtonIsPressed(oneButton = false) {
        return this.pressedButtons.includes(2) && (!oneButton || this.pressedButtons.length === 0)
    }

    disableContextMenu() {
        this.domElement.addEventListener('contextmenu', this.onContextmenu.bind(this))
    }

    enableContextMenu() {
        this.domElement.removeEventListener('contextmenu', this.onContextmenu.bind(this))
    }
}
