export function ringStroke(percent: number, radius = 54, stroke = 8) {
  const c = 2 * Math.PI * radius
  const offset = c - (Math.min(100, Math.max(0, percent)) / 100) * c
  return { c, offset, radius, stroke }
}
