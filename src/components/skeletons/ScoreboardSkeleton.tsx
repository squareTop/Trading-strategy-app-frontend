import React from 'react'

export function ScoreboardSkeleton() {
  return (
    <div className="min-h-screen bg-brand-bg font-sans selection:bg-brand-primary/20 selection:text-brand-dark pb-20">
      <main className="max-w-360 mx-auto px-4 md:px-8 mt-8">
        {/* Banner Section */}
        <div className="bg-white border border-brand-border rounded-xl p-6 md:p-8 shadow-xs mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-2xl space-y-3">
              <div className="h-3.5 w-36 bg-brand-primary/20 rounded font-mono animate-pulse" />
              <div className="h-9 md:h-10 w-72 sm:w-96 bg-gray-200 rounded-lg animate-pulse" />
              <div className="space-y-1.5 pt-1">
                <div className="h-3.5 w-full max-w-xl bg-gray-100 rounded animate-pulse" />
                <div className="h-3.5 w-3/4 max-w-md bg-gray-100 rounded animate-pulse" />
              </div>
            </div>

            {/* Right Status Card Skeleton */}
            <div className="bg-[#f0eadd]/70 p-4 rounded-xl border border-brand-border/60 shrink-0 text-xs font-mono space-y-3 w-full md:w-64 animate-pulse">
              <div className="flex items-center justify-between border-b border-brand-border/50 pb-2.5">
                <div className="h-3 w-24 bg-gray-300/70 rounded" />
                <div className="h-3 w-12 bg-emerald-200 rounded" />
              </div>
              <div className="flex items-center justify-between">
                <div className="h-3 w-20 bg-gray-300/70 rounded" />
                <div className="h-3 w-32 bg-gray-300/70 rounded" />
              </div>
            </div>
          </div>
        </div>

        {/* KPI Stats Grid (5 Cards) */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Resolved Trades', sub: 'Completed signals' },
            { label: 'Win Rate', sub: 'Batting average' },
            { label: 'Profit Factor', sub: 'Gross win / gross loss' },
            { label: 'Expectancy (R)', sub: 'Avg R per trade' },
            { label: 'Total Realized R', sub: 'Cumulative units' },
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-white border border-brand-border rounded-xl p-4 flex flex-col justify-between shadow-xs h-28 animate-pulse"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3.5 h-3.5 rounded-full bg-brand-primary/20" />
                <div className="h-2.5 w-20 bg-gray-200 rounded" />
              </div>
              <div className="space-y-1.5">
                <div className="h-7 w-20 bg-gray-200 rounded" />
                <div className="h-2.5 w-24 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* Filter Controls & Tabs Placeholder */}
        <div className="bg-white border border-brand-border rounded-xl p-4 mb-6 shadow-xs animate-pulse space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-24 bg-gray-100 rounded-lg border border-brand-border/60" />
              <div className="h-8 w-32 bg-gray-100 rounded-lg border border-brand-border/60" />
              <div className="h-8 w-28 bg-gray-100 rounded-lg border border-brand-border/60" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-44 bg-gray-100 rounded-lg border border-brand-border/60" />
              <div className="h-8 w-24 bg-gray-100 rounded-lg border border-brand-border/60" />
            </div>
          </div>
        </div>

        {/* Table Skeleton Card */}
        <div className="bg-white border border-brand-border rounded-xl shadow-xs overflow-hidden">
          {/* Table Header Bar */}
          <div className="px-6 py-4 border-b border-brand-border bg-brand-bg/40 flex items-center justify-between">
            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-28 bg-gray-200 rounded animate-pulse" />
          </div>

          {/* Table Columns Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50/80 border-b border-brand-border text-xs">
            <div className="col-span-3 h-3 bg-gray-200 rounded animate-pulse" />
            <div className="col-span-2 h-3 bg-gray-200 rounded animate-pulse" />
            <div className="col-span-2 h-3 bg-gray-200 rounded animate-pulse" />
            <div className="col-span-2 h-3 bg-gray-200 rounded animate-pulse" />
            <div className="col-span-3 h-3 bg-gray-200 rounded animate-pulse" />
          </div>

          {/* Table Data Rows */}
          <div className="divide-y divide-brand-border/50">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-12 gap-4 px-6 py-4 items-center animate-pulse"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="col-span-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-200 shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3.5 bg-gray-200 rounded w-20" />
                    <div className="h-2.5 bg-gray-100 rounded w-32" />
                  </div>
                </div>
                <div className="col-span-2 space-y-1">
                  <div className="h-3 bg-gray-200 rounded w-16" />
                  <div className="h-2 bg-gray-100 rounded w-10" />
                </div>
                <div className="col-span-2">
                  <div className="h-4 bg-emerald-100 rounded-md w-16" />
                </div>
                <div className="col-span-2">
                  <div className="h-3.5 bg-gray-200 rounded w-14" />
                </div>
                <div className="col-span-3 flex items-center justify-end gap-2">
                  <div className="h-3.5 bg-gray-200 rounded w-20" />
                  <div className="h-6 w-16 bg-gray-100 rounded border border-brand-border/40" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

export default ScoreboardSkeleton
