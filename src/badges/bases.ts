const rightShield = 'c40 20 84 27 120 30v85c0 83-52 131-120 161'
const leftShield = 'c-68-30-120-78-120-161v-85c36-3 80-10 120-30'
const shield = {
  outer: `M160 23 ${rightShield} ${leftShield} Z`,
  field: 'M160 43C196 59 231 65 261 69V138C261 206 220 250 160 279C100 250 59 206 59 138V69C89 65 124 59 160 43Z',
  edge: (span: number) => `M${160 + span / 2} 23 ${rightShield} h${-span} ${leftShield} Z`,
}

function polygonPoints(sides: number, radius: number, innerRadius: number) {
  return Array.from({ length: sides }, (_, i) => {
    const angle = i * 2 * Math.PI / sides - Math.PI / 2
    const r = i % 2 ? innerRadius : radius
    return { x: 160 + Math.cos(angle) * r, y: 160 + Math.sin(angle) * r }
  })
}

function polygonPath(points: Array<{ x: number; y: number }>) {
  return `M${points.map(({ x, y }) => `${x} ${y}`).join('L')}Z`
}

function polygon(sides: number, radius: number, fieldRadius: number, innerRadius = radius, fieldInner = fieldRadius) {
  const outer = polygonPoints(sides, radius, innerRadius)
  const y = Math.max(...outer.map(point => point.y))
  const bottomRight = outer.findIndex(point => Math.abs(point.y - y) < .001)
  const edge = (span: number) => {
    const half = span / 2
    const right = outer.slice(0, bottomRight + 1).map(p => ({ x: p.x + half, y: p.y }))
    const left = outer.slice(bottomRight).map(p => ({ x: p.x - half, y: p.y }))
    return polygonPath([...right, ...left, { x: outer[0].x - half, y: outer[0].y }])
  }
  return { outer: polygonPath(outer), field: polygonPath(polygonPoints(sides, fieldRadius, fieldInner)), edge }
}

function circle(radius: number, span = 0) {
  return `M${160 + span / 2} ${160 - radius}a${radius} ${radius} 0 0 1 0 ${radius * 2}h${-span}a${radius} ${radius} 0 0 1 0 ${-radius * 2}Z`
}

const bases = {
  shield,
  circle: { outer: circle(137), field: circle(117), edge: (span: number) => circle(137, span) },
  hexagon: polygon(6, 140, 117),
  octagon: polygon(8, 140, 118),
  star: polygon(10, 145, 115, 106, 85),
}

export type BadgeBase = keyof typeof bases

export function badgePaths(base: BadgeBase) {
  return {
    outer: new Path2D(bases[base].outer),
    field: new Path2D(bases[base].field),
    edge: (span: number) => new Path2D(bases[base].edge(span)),
  }
}
