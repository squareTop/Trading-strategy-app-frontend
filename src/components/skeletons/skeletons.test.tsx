import { describe, it, expect } from 'vitest'
import React from 'react'
import { ScoreboardSkeleton } from './ScoreboardSkeleton'
import { DailySignalsSkeleton } from './DailySignalsSkeleton'
import { CongressSkeleton } from './CongressSkeleton'
import { PageSkeletonFallback } from './PageSkeletonFallback'

describe('Route Skeletons', () => {
  it('ScoreboardSkeleton renders React element tree', () => {
    const el = <ScoreboardSkeleton />
    expect(React.isValidElement(el)).toBe(true)
    expect(el.type).toBe(ScoreboardSkeleton)
  })

  it('DailySignalsSkeleton renders React element tree', () => {
    const el = <DailySignalsSkeleton />
    expect(React.isValidElement(el)).toBe(true)
    expect(el.type).toBe(DailySignalsSkeleton)
  })

  it('CongressSkeleton renders React element tree', () => {
    const el = <CongressSkeleton />
    expect(React.isValidElement(el)).toBe(true)
    expect(el.type).toBe(CongressSkeleton)
  })

  it('PageSkeletonFallback renders React element tree', () => {
    const el = <PageSkeletonFallback />
    expect(React.isValidElement(el)).toBe(true)
    expect(el.type).toBe(PageSkeletonFallback)
  })
})
