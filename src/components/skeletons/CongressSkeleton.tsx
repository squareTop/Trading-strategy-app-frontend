import React from 'react'

export function CongressSkeleton() {
  return (
    <div className="min-h-screen bg-brand-bg font-sans selection:bg-brand-primary/20 selection:text-brand-dark pb-20">
      {/* Hero / Header Section */}
      <section className="bg-white border-b border-brand-border px-3 sm:px-4 md:px-8 py-6 sm:py-8 shadow-xs">
        <div className="max-w-360 mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <div className="h-4 w-32 bg-brand-primary/20 rounded font-mono animate-pulse" />
                <div className="h-4 w-20 bg-emerald-100 rounded font-mono animate-pulse" />
              </div>
              <div className="h-8 sm:h-9 w-72 sm:w-96 bg-gray-200 rounded-lg animate-pulse" />
              <div className="h-3.5 w-full max-w-xl bg-gray-100 rounded animate-pulse" />
            </div>

            {/* Refresh / Timestamp Skeleton */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="h-4 w-28 bg-gray-100 rounded animate-pulse hidden sm:block" />
              <div className="h-8 w-24 bg-gray-100 rounded-lg border border-brand-border/60 animate-pulse" />
            </div>
          </div>

          {/* Chamber Toggle Pills Skeleton */}
          <div className="flex items-center gap-2 mt-6 pt-4 border-t border-brand-border/60">
            <div className="h-3 w-16 bg-gray-200 rounded mr-1" />
            <div className="h-8 w-28 bg-brand-dark/20 rounded-lg animate-pulse" />
            <div className="h-8 w-24 bg-gray-100 rounded-lg border border-brand-border/60 animate-pulse" />
            <div className="h-8 w-24 bg-gray-100 rounded-lg border border-brand-border/60 animate-pulse" />
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-360 mx-auto px-3 sm:px-4 md:px-8 pt-6">
        {/* KPI Stats Cards (4 cards) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
          {[
            { label: 'Disclosed Trades', sub: 'Loaded transactions' },
            { label: 'Volume Traded', sub: 'Estimated bracket value' },
            { label: 'Active Politicians', sub: 'Senators & Reps' },
            { label: 'Avg Trade Return', sub: 'Holding return benchmark' },
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

        {/* Filter and Search Bar Skeleton */}
        <div className="bg-white border border-brand-border rounded-xl p-3.5 sm:p-4 mb-6 shadow-xs animate-pulse">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="h-9 w-full lg:w-80 bg-gray-100 rounded-lg border border-brand-border/60" />
            <div className="flex items-center gap-2 flex-wrap">
              <div className="h-8 w-24 bg-gray-100 rounded-lg border border-brand-border/60" />
              <div className="h-8 w-24 bg-gray-100 rounded-lg border border-brand-border/60" />
              <div className="h-8 w-28 bg-gray-100 rounded-lg border border-brand-border/60" />
            </div>
          </div>
        </div>

        {/* Disclosures Table Skeleton */}
        <div className="bg-white border border-brand-border rounded-xl shadow-xs overflow-hidden">
          {/* Table Header Bar */}
          <div className="px-6 py-4 border-b border-brand-border bg-brand-bg/40 flex items-center justify-between">
            <div className="h-4 w-44 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
          </div>

          {/* Table Header Columns */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50/80 border-b border-brand-border text-xs">
            <div className="col-span-3 h-3 bg-gray-200 rounded animate-pulse" />
            <div className="col-span-2 h-3 bg-gray-200 rounded animate-pulse" />
            <div className="col-span-2 h-3 bg-gray-200 rounded animate-pulse" />
            <div className="col-span-2 h-3 bg-gray-200 rounded animate-pulse" />
            <div className="col-span-3 h-3 bg-gray-200 rounded animate-pulse" />
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-brand-border/50">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-12 gap-4 px-6 py-4 items-center animate-pulse"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="col-span-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
                  <div className="space-y-1 flex-1">
                    <div className="h-3.5 bg-gray-200 rounded w-28" />
                    <div className="h-2 bg-gray-100 rounded w-20" />
                  </div>
                </div>
                <div className="col-span-2 space-y-1">
                  <div className="h-3.5 bg-gray-200 rounded w-16" />
                  <div className="h-2 bg-gray-100 rounded w-24" />
                </div>
                <div className="col-span-2">
                  <div className="h-4 bg-emerald-100 rounded-md w-14" />
                </div>
                <div className="col-span-2 space-y-1">
                  <div className="h-3.5 bg-gray-200 rounded w-20" />
                  <div className="h-2 bg-gray-100 rounded w-12" />
                </div>
                <div className="col-span-3 flex items-center justify-end gap-2">
                  <div className="h-3.5 bg-gray-200 rounded w-16" />
                  <div className="h-7 w-20 bg-gray-100 rounded-lg border border-brand-border/50" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

export default CongressSkeleton
