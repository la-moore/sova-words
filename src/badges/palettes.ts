// Light, highlight, midtone, shade, deep shade.
const metals = {
  gold: ['#fff0b1', '#f6ca6b', '#d49936', '#835322', '#4b290f'],
  silver: ['#f3f8ff', '#cbd7e3', '#8396ac', '#455466', '#263242'],
  bronze: ['#ffdfba', '#efa771', '#be784b', '#703d29', '#42251c'],
  ruby: ['#ffe2df', '#ff929e', '#d54c66', '#89293e', '#481422'],
  sapphire: ['#ddf3ff', '#8bbff8', '#5088cb', '#284d86', '#182a51'],
  emerald: ['#e1ffdf', '#8de3a8', '#49a879', '#236447', '#103d2c'],
  amethyst: ['#f5e5ff', '#d2a3f7', '#9c69c9', '#623c87', '#342146'],
}

export type BadgePalette = keyof typeof metals
export type Stop = readonly [number, string]

export function badgePalette(preset: BadgePalette) {
  const [light, highlight, mid, shade, deep] = metals[preset]
  const gold = preset === 'gold'
  return {
    light, highlight, mid, shade, deep,
    metal: [
      [0, light], [.13, gold ? '#c18429' : mid], [.31, highlight], [.49, shade],
      [.66, gold ? '#e2a244' : mid], [.81, gold ? '#9a5d20' : shade], [.94, highlight], [1, light],
    ] satisfies Stop[],
    front: [[0, shade], [.32, gold ? '#c28a3c' : mid], [.54, gold ? '#b78034' : mid], [1, gold ? '#926028' : shade]] satisfies Stop[],
    back: [[0, gold ? '#c2904a' : mid], [.38, gold ? '#8e5c29' : shade], [.61, gold ? '#805023' : shade], [1, gold ? '#bc853d' : mid]] satisfies Stop[],
    rim: [[0, gold ? '#fff4cc' : light], [.45, gold ? '#e4ae4e' : highlight], [.77, gold ? '#7c4515' : deep], [1, gold ? '#b88231' : mid]] satisfies Stop[],
    inset: [[0, gold ? '#553014' : deep], [.52, gold ? '#9d6624' : shade], [1, gold ? '#ffda83' : highlight]] satisfies Stop[],
    edge: [[0, gold ? '#e5b65d' : highlight], [.36, gold ? '#966025' : shade], [.7, gold ? '#4f2c11' : deep], [1, gold ? '#ac7130' : shade]] satisfies Stop[],
    fieldDepth: gold ? '#67401e' : deep,
    relief: [[0, gold ? '#c49040' : mid], [.45, gold ? '#81501c' : shade], [1, gold ? '#4d290e' : deep]] satisfies Stop[],
    glyphDiffuse: gold ? '#ffdfae' : light,
    glyphSpecular: gold ? '#fff0ca' : light,
    glare: gold ? ['#ffe1a3', '#ffc86c'] : [light, highlight],
  }
}

export function linear(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, stops: Stop[]) {
  const gradient = ctx.createLinearGradient(x0, y0, x1, y1)
  for (const [offset, color] of stops) gradient.addColorStop(offset, color)
  return gradient
}
