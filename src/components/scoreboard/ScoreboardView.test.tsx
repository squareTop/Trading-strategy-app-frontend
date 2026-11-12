// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ScoreboardView } from './ScoreboardView'
import { makePayload } from './fixtures'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, hash, params, ...rest }: any) => (
    <a href={`${String(to).replace('$id', params?.id ?? '')}${hash ? `#${hash}` : ''}`} {...rest}>{children}</a>
  ),
}))

afterEach(() => cleanup())

describe('ScoreboardView', () => {
  it('shows "Scoreboard unavailable" with a retry button that refetches', () => {
    const refetch = vi.fn()
    render(<ScoreboardView data={undefined} isLoading={false} error={new Error('status 500')} refetch={refetch} />)
    expect(screen.getByText('Scoreboard unavailable')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('shows the skeleton while loading', () => {
    render(<ScoreboardView data={undefined} isLoading={true} error={null} refetch={() => {}} />)
    expect(screen.getByLabelText('Loading the scoreboard')).toBeTruthy()
  })

  it('says no strategies are live yet', () => {
    render(<ScoreboardView data={makePayload({ live: [] })} isLoading={false} error={null} refetch={() => {}} />)
    expect(screen.getByText('No strategies are live yet')).toBeTruthy()
  })

  it('renders live cards, the update line and the collapsed retired section', () => {
    render(<ScoreboardView data={makePayload()} isLoading={false} error={null} refetch={() => {}} />)
    expect(screen.getByText(/Updated 12 Nov 2026 08:31 SGT · data to 11 Nov/)).toBeTruthy()
    expect(screen.getAllByRole('article')).toHaveLength(2)
    expect(screen.queryByRole('status')).toBeNull()                       // not stale
    const retired = screen.getByRole('button', { name: /Retired strategies \(frozen\)/ })
    expect(retired.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(retired)
    expect(screen.getByText('smooth_trend@1')).toBeTruthy()
    expect(document.body.textContent?.toLowerCase()).not.toContain('roi')
  })

  it('warns when the figures may be stale', () => {
    render(<ScoreboardView data={makePayload({ stale: true, expected_us_bar: '2026-11-12' })} isLoading={false} error={null} refetch={() => {}} />)
    expect(screen.getByRole('status').textContent).toContain('Figures may be stale')
  })

  it('opens the retired section for a #hash pointing at a retired card', () => {
    window.location.hash = '#smooth-trend-1-long'
    render(<ScoreboardView data={makePayload()} isLoading={false} error={null} refetch={() => {}} />)
    expect(screen.getByRole('button', { name: /Retired strategies/ }).getAttribute('aria-expanded')).toBe('true')
    expect(document.getElementById('smooth-trend-1-long')?.tagName).toBe('ARTICLE')
    window.location.hash = ''
  })
})
