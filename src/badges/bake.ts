import { badgePaths, type BadgeBase } from './bases'
import { engrave } from './engraving'
import { badgePalette, linear, type BadgePalette } from './palettes'

export interface BadgeSpec {
  id: string
  base: BadgeBase
  palette: BadgePalette
  glyph: string
  label?: string
  /** Optional outlines in badge coordinates for an exact extrusion. */
  reliefContours?: readonly string[]
}

export const BADGE_SIZE = 320
type Palette = ReturnType<typeof badgePalette>
type Point = { x: number; y: number }
type Segment = [Point, Point]

export interface BakedBadge {
  paths: ReturnType<typeof badgePaths>
  palette: Palette
  front: HTMLCanvasElement
  back: HTMLCanvasElement
  rim: HTMLCanvasElement
  glyph: CanvasImageSource
  glyphWall?: HTMLCanvasElement
  segments: Segment[]
  label?: string
}

const previewCache = new Map<string, Promise<BakedBadge>>()
const thumbnailCache = new Map<string, Promise<BakedBadge>>()

export async function svgToImage(svg: string, size: number, dpr: number): Promise<HTMLImageElement> {
  const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml')
  const root = parsed.documentElement
  if (root.localName !== 'svg' || root.namespaceURI !== 'http://www.w3.org/2000/svg') {
    throw new Error('Invalid badge SVG')
  }
  const pixels = Math.max(1, Math.round(size * dpr))
  root.setAttribute('width', String(pixels))
  root.setAttribute('height', String(pixels))
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(root)], { type: 'image/svg+xml' }))
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    return image
  } finally {
    URL.revokeObjectURL(url)
  }
}

function layer(pixels: number) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = pixels
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D is unavailable')
  ctx.scale(pixels / BADGE_SIZE, pixels / BADGE_SIZE)
  return { canvas, ctx }
}

async function glyphMarkup(spec: BadgeSpec) {
  const inline = spec.glyph.trimStart().startsWith('<')
  const response = inline ? undefined : await fetch(spec.glyph)
  if (response && !response.ok) throw new Error(`Could not load badge glyph: ${response.status}`)
  const root = new DOMParser().parseFromString(response ? await response.text() : spec.glyph, 'image/svg+xml').documentElement
  if (root.localName !== 'svg') throw new Error('Invalid badge glyph')
  root.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  if (!root.hasAttribute('viewBox')) {
    const width = Number.parseFloat(root.getAttribute('width') ?? '') || 24
    const height = Number.parseFloat(root.getAttribute('height') ?? '') || 24
    root.setAttribute('viewBox', `0 0 ${width} ${height}`)
  }

  if (spec.reliefContours) return new XMLSerializer().serializeToString(root)
  const span = spec.base === 'star' ? 108 : 132
  root.setAttribute('x', String((BADGE_SIZE - span) / 2))
  root.setAttribute('y', String((BADGE_SIZE - span) / 2 - (spec.label ? 16 : 0)))
  root.setAttribute('width', String(span))
  root.setAttribute('height', String(span))
  return new XMLSerializer().serializeToString(root)
}

async function emboss(spec: BadgeSpec, palette: Palette, size: number, dpr: number) {
  const glyph = await glyphMarkup(spec)
  const svg = (content: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320">${content}</svg>`
  const source = svg(`
    <defs><filter id="badge-emboss" x="0" y="0" width="320" height="320"
      filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceAlpha" stdDeviation=".9" result="height"/>
      <feFlood flood-color="${palette.mid}" result="color"/>
      <feComposite in="color" in2="SourceAlpha" operator="in" result="metal"/>
      <feDiffuseLighting in="height" surfaceScale="5" diffuseConstant=".85" lighting-color="${palette.glyphDiffuse}" result="diffuse">
        <fePointLight x="45" y="10" z="135"/>
      </feDiffuseLighting>
      <feComposite in="diffuse" in2="SourceAlpha" operator="in" result="lit"/>
      <feComposite in="metal" in2="lit" operator="arithmetic" k1=".55" k2=".62" result="shaded"/>
      <feSpecularLighting in="height" surfaceScale="6" specularConstant="1.35" specularExponent="18"
        lighting-color="${palette.glyphSpecular}" result="spec">
        <fePointLight x="45" y="10" z="135"/>
      </feSpecularLighting>
      <feComposite in="spec" in2="SourceAlpha" operator="in" result="highlight"/>
      <feComposite in="shaded" in2="highlight" operator="arithmetic" k2="1" k3=".85" result="embossed"/>
      <feComposite in="embossed" in2="SourceAlpha" operator="in"/>
    </filter></defs>
    <g filter="url(#badge-emboss)">${glyph}</g>`)

  try {
    const image = await svgToImage(source, size, dpr)
    const probe = layer(64)
    probe.ctx.drawImage(image, 0, 0, BADGE_SIZE, BADGE_SIZE)
    const pixels = probe.ctx.getImageData(0, 0, 64, 64).data
    if (pixels.some((value, index) => index % 4 === 3 && value > 0)) return image
  } catch {
    // Fall back if the browser rejects the SVG lighting filter.
  }

  const mask = await svgToImage(svg(glyph), size, dpr)
  const { canvas, ctx } = layer(mask.width)
  const tint = layer(mask.width)
  for (const [offset, color] of [[2, palette.deep], [-1, palette.light], [0, palette.mid]] as const) {
    tint.ctx.clearRect(0, 0, BADGE_SIZE, BADGE_SIZE)
    tint.ctx.drawImage(mask, 0, 0, BADGE_SIZE, BADGE_SIZE)
    tint.ctx.globalCompositeOperation = 'source-in'
    tint.ctx.fillStyle = color
    tint.ctx.fillRect(0, 0, BADGE_SIZE, BADGE_SIZE)
    tint.ctx.globalCompositeOperation = 'source-over'
    ctx.drawImage(tint.canvas, offset, offset, BADGE_SIZE, BADGE_SIZE)
  }
  return canvas
}

function reliefSegments(contours: readonly string[]): Segment[] {
  return contours.flatMap(contour => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', contour)
    const length = path.getTotalLength()
    const steps = Math.ceil(length / 3)
    return Array.from({ length: steps }, (_, i): Segment => [
      path.getPointAtLength(i * length / steps),
      path.getPointAtLength((i + 1) * length / steps),
    ])
  })
}

async function bake(spec: BadgeSpec, size: number, dpr: number): Promise<BakedBadge> {
  const pixels = Math.max(1, Math.round(size * dpr))
  const paths = badgePaths(spec.base)
  const palette = badgePalette(spec.palette)
  const glyph = await emboss(spec, palette, size, dpr)
  const segments = reliefSegments(spec.reliefContours ?? [])

  const rim = layer(pixels)
  const { ctx } = rim
  const metal = typeof ctx.createConicGradient === 'function'
    ? ctx.createConicGradient(-2.3, 160, 141)
    : ctx.createLinearGradient(46, 25, 265, 295)
  for (const [offset, color] of palette.metal) metal.addColorStop(offset, color)
  ctx.fillStyle = metal
  ctx.fill(paths.outer)
  ctx.save()
  ctx.clip(paths.outer)
  ctx.lineWidth = 11
  ctx.strokeStyle = linear(ctx, 58, 22, 215, 297, palette.rim)
  ctx.stroke(paths.outer)
  ctx.restore()
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fill(paths.field)

  function face(front: boolean) {
    const { canvas, ctx } = layer(pixels)
    ctx.fillStyle = linear(ctx, 160, 43, 160, 279, front ? palette.front : palette.back)
    ctx.fill(paths.field)
    ctx.lineWidth = 2
    ctx.strokeStyle = linear(ctx, 72, 55, 215, 267, palette.inset)
    ctx.stroke(paths.field)
    return canvas
  }

  const glyphWall = segments.length === 0 ? layer(pixels) : undefined
  if (glyphWall) {
    glyphWall.ctx.drawImage(glyph, 0, 0, BADGE_SIZE, BADGE_SIZE)
    glyphWall.ctx.globalCompositeOperation = 'source-in'
    glyphWall.ctx.fillStyle = linear(glyphWall.ctx, 120, 80, 190, 210, palette.relief)
    glyphWall.ctx.fillRect(0, 0, BADGE_SIZE, BADGE_SIZE)
  }

  return { paths, palette, front: face(true), back: face(false), rim: rim.canvas,
    glyph, glyphWall: glyphWall?.canvas, segments, label: spec.label }
}

export function bakeBadge(spec: BadgeSpec, size: number, dpr = window.devicePixelRatio || 1) {
  const key = JSON.stringify([spec.id, size, dpr])
  const large = size > 128
  const cache = large ? previewCache : thumbnailCache
  let pending = cache.get(key)
  if (pending) {
    cache.delete(key)
  } else {
    pending = bake(spec, size, dpr).catch(error => {
      if (cache.get(key) === pending) cache.delete(key)
      throw error
    })
  }
  cache.set(key, pending)
  const oldest = cache.keys().next().value
  if (oldest !== undefined && cache.size > (large ? 4 : 24)) cache.delete(oldest)
  return pending
}

export function paintStraightBadge(ctx: CanvasRenderingContext2D, texture: BakedBadge) {
  const { paths, palette, front, rim, glyph, label, segments } = texture
  ctx.fillStyle = palette.fieldDepth
  ctx.fill(paths.field)
  ctx.save()
  ctx.clip(paths.field)
  ctx.drawImage(front, 0, 0, BADGE_SIZE, BADGE_SIZE)
  if (label) engrave(ctx, label, true, 0, palette, label === '7' && segments.length > 0)
  ctx.drawImage(glyph, 0, 0, BADGE_SIZE, BADGE_SIZE)
  ctx.restore()
  ctx.drawImage(rim, 0, 0, BADGE_SIZE, BADGE_SIZE)
}

export function badgeThumbnail(texture: BakedBadge, locked: boolean): HTMLCanvasElement {
  const thumbnail = layer(texture.front.width)
  paintStraightBadge(thumbnail.ctx, texture)
  if (locked) {
    const { width, height } = thumbnail.canvas
    const image = thumbnail.ctx.getImageData(0, 0, width, height)
    for (let i = 0; i < image.data.length; i += 4) {
      const gray = .2126 * image.data[i] + .7152 * image.data[i + 1] + .0722 * image.data[i + 2]
      image.data[i] = image.data[i + 1] = image.data[i + 2] = gray
      image.data[i + 3] *= .4
    }
    thumbnail.ctx.putImageData(image, 0, 0)
  }
  return thumbnail.canvas
}

export async function bakeThumbnail(spec: BadgeSpec, size: number, locked: boolean): Promise<HTMLCanvasElement> {
  const texture = await bakeBadge(spec, size, Math.min(2, window.devicePixelRatio || 1))
  return badgeThumbnail(texture, locked)
}
