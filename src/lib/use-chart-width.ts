import { useEffect, useRef, useState } from 'react'

/**
 * Width of a chart's container in CSS pixels, so SVG charts draw at their real
 * size (text stays readable on phones instead of being scaled down with the
 * viewBox). Falls back to `initial` during server rendering.
 */
export function useChartWidth<T extends HTMLElement>(initial: number, min = 280) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(initial)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const update = () => {
      const w = Math.round(el.getBoundingClientRect().width)
      if (w > 0) setWidth(Math.max(min, w))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [min])
  return { ref, width }
}
