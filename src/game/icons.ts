import { ImageShape } from '@cynfas/core'
import arrow from '@scarlab-icons/icons/base/arrow-right-lg.svg?raw'
import back from '@scarlab-icons/icons/base/chevron-left-lg.svg?raw'
import check from '@scarlab-icons/icons/base/check-lg.svg?raw'
import erase from '@scarlab-icons/icons/outline/backspace.svg?raw'
import hint from '@scarlab-icons/icons/outline/bulb-on.svg?raw'
import shuffle from '@scarlab-icons/icons/base/shuffle.svg?raw'
import soundOff from '@scarlab-icons/icons/outline/volume-x.svg?raw'
import soundOn from '@scarlab-icons/icons/outline/volume-high.svg?raw'
import star from '@scarlab-icons/icons/outline/star.svg?raw'
import streak from '@scarlab-icons/icons/outline/fire.svg?raw'
import { theme } from './theme'

const icons = { arrow, back, check, erase, hint, shuffle, soundOff, soundOn, star, streak }
export { soundOff, soundOn }
export type IconName = keyof typeof icons

const images = new Map<string, HTMLImageElement>()

export class Icon extends ImageShape {
  constructor(name: IconName, size = 24, x = 0, y = 0, color: string = theme.text) {
    super(undefined, size, size, { position: { x, y }, pivot: 0.5 })
    this.setIcon(name, color)
  }

  setIcon(name: IconName, color: string = theme.text): void {
    const key = `${name}:${color}`
    let image = images.get(key)
    if (!image) {
      image = new Image()
      const svg = icons[name].replace('<svg ', `<svg width="24" height="24" color="${color}" `)
      image.src = `data:image/svg+xml,${encodeURIComponent(svg)}`
      images.set(key, image)
    }
    this.source = image
  }
}
