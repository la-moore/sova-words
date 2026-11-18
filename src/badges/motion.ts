export const TURN = 2 * Math.PI

export function badgeProjection(angle: number) {
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)
  return { front: cosine >= 0, width: Math.max(.004, Math.abs(cosine)), sine, edge: 20 * sine }
}

export function nearestFace(angle: number) {
  return Math.round(angle / TURN) * TURN
}

export function coast(angle: number, velocity: number, seconds: number) {
  const decay = Math.exp(-5 * seconds)
  return { angle: angle + velocity * (1 - decay) / 5, velocity: velocity * decay }
}
