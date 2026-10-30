import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Ticker Skeleton */}
      <div className="h-9 bg-[#dc2626]/20 animate-pulse w-full" />

      {/* Header Skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 w-full border-b border-[var(--border-light)]">
        <div className="h-10 w-64 bg-gray-200 dark:bg-gray-800 rounded-lg mx-auto mb-4 animate-pulse" />
        <div className="h-4 w-96 bg-gray-100 dark:bg-gray-800 rounded mx-auto animate-pulse" />
      </div>

      {/* Main Grid Skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 w-full flex-1 space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Hero Story Skeleton */}
          <div className="lg:col-span-7 space-y-4">
            <div className="h-5 w-32 bg-red-100 dark:bg-red-950/40 rounded animate-pulse" />
            <div className="h-12 w-full bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
            <div className="h-6 w-3/4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            <div className="aspect-[16/9] w-full bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
          </div>

          {/* Secondary Stories Skeleton */}
          <div className="lg:col-span-5 space-y-6 lg:border-l lg:border-[var(--border-light)] lg:pl-8">
            <div className="h-5 w-40 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            {[1, 2, 3].map((n) => (
              <div key={n} className="space-y-2 border-b border-[var(--border-light)] pb-5">
                <div className="h-4 w-24 bg-red-100 dark:bg-red-950/40 rounded animate-pulse" />
                <div className="h-6 w-full bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                <div className="h-4 w-5/6 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
