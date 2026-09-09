import { useRouterState } from '@tanstack/react-router'
import { useEffect, useState, useRef } from 'react'

export function NavigationProgressBar() {
  const isLoading = useRouterState({ select: (s) => s.isLoading })
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isLoading) {
      setVisible(true)
      setProgress(25)

      // Trickle progress up to ~85% while loading
      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 85) return prev
          const step = Math.max(1, (88 - prev) * 0.12)
          return Math.min(85, prev + step)
        })
      }, 150)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      setProgress(100)
      const timeout = setTimeout(() => {
        setVisible(false)
        setProgress(0)
      }, 300)
      return () => clearTimeout(timeout)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isLoading])

  if (!visible && progress === 0) return null

  return (
    <div
      aria-hidden="true"
      className={`fixed top-0 left-0 right-0 h-[3px] z-[9999] pointer-events-none transition-opacity duration-300 ${
        isLoading ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        className="h-full bg-gradient-to-r from-amber-500 via-brand-primary to-orange-600 shadow-[0_0_10px_rgba(249,115,22,0.8)] transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}

export default NavigationProgressBar
