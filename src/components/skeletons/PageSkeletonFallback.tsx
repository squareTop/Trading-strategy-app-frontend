import React from 'react'

export function PageSkeletonFallback() {
  return (
    <div className="min-h-screen bg-brand-bg font-sans selection:bg-brand-primary/20 selection:text-brand-dark pb-20">
      <main className="max-w-360 mx-auto px-4 md:px-8 mt-8">
        {/* Banner Section */}
        <div className="bg-white border border-brand-border rounded-xl p-6 md:p-8 shadow-xs mb-8">
          <div className="space-y-3 max-w-2xl">
            <div className="h-3.5 w-32 bg-brand-primary/20 rounded font-mono animate-pulse" />
            <div className="h-9 w-64 md:w-80 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-3.5 w-full max-w-lg bg-gray-100 rounded animate-pulse" />
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-white border border-brand-border rounded-xl p-5 shadow-xs h-28 flex flex-col justify-between animate-pulse"
            >
              <div className="h-3 w-24 bg-gray-200 rounded" />
              <div className="h-7 w-32 bg-gray-200 rounded" />
            </div>
          ))}
        </div>

        {/* Content Block Skeleton */}
        <div className="bg-white border border-brand-border rounded-xl p-6 shadow-xs animate-pulse space-y-4">
          <div className="h-5 w-48 bg-gray-200 rounded mb-6" />
          <div className="space-y-3">
            <div className="h-4 bg-gray-100 rounded w-full" />
            <div className="h-4 bg-gray-100 rounded w-5/6" />
            <div className="h-4 bg-gray-100 rounded w-4/6" />
            <div className="h-4 bg-gray-100 rounded w-full" />
            <div className="h-4 bg-gray-100 rounded w-3/4" />
          </div>
        </div>
      </main>
    </div>
  )
}

export default PageSkeletonFallback
