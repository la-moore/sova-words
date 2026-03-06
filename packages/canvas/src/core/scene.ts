import { Color } from './color'
import { Container } from './node'

export class Scene extends Container {
    background?: Color

    constructor() {
        super()
    }
}
