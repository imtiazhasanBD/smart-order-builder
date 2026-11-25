import React from 'react';
import { Skeleton } from './ui/Skeleton';

export const OrderBuilderSkeleton: React.FC = () => {
  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
      data-testid="order-builder-skeleton"
    >
      {/* Left Column: Banner + Categories */}
      <div className="lg:col-span-7 xl:col-span-8 space-y-6 pb-48 lg:pb-0">
        {/* Product Banner Skeleton */}
        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-60 sm:w-80" />
            <Skeleton className="h-4 w-72 sm:w-96" />
          </div>
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>

        {/* Section Header Controls */}
        <div className="flex items-center justify-between px-1">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-24" />
        </div>

        {/* Categories Skeletons (simulating Bread, Eggs, Protein, Sides) */}
        <div className="space-y-4">
          {[1, 2, 3].map((groupIndex) => (
            <div
              key={groupIndex}
              className="bg-white border border-slate-200 rounded-md p-4 sm:p-5 shadow-sm space-y-4"
            >
              {/* Category Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-28" />
                  <Skeleton className="h-5 w-20 rounded-md" />
                </div>
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-5 w-36 rounded-sm" />
                  <Skeleton className="h-5 w-5 rounded" />
                </div>
              </div>

              {/* Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1, 2].map((optIndex) => (
                  <div
                    key={optIndex}
                    className="border border-slate-200 rounded-md p-3.5 bg-white space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-14 rounded-sm" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <Skeleton className="h-3 w-12" />
                      <div className="flex items-center gap-2">
                        <Skeleton className="w-7 h-7 rounded-md" />
                        <Skeleton className="w-4 h-4 rounded" />
                        <Skeleton className="w-7 h-7 rounded-md" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column / Sidebar Preview Skeleton */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 shadow-2xl p-3 lg:static lg:p-0 lg:bg-transparent lg:border-none lg:shadow-none lg:col-span-5 xl:col-span-4 lg:sticky lg:top-20 space-y-3">
        <div className="bg-white rounded-md shadow-md border border-slate-200 overflow-hidden">
          {/* Header Skeleton */}
          <div className="hidden lg:flex items-center justify-between px-5 py-3.5 bg-slate-900 rounded-t-md">
            <div className="flex items-center gap-2.5">
              <Skeleton className="w-8 h-8 rounded-md bg-slate-800" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-28 bg-slate-800" />
                <Skeleton className="h-3 w-36 bg-slate-800" />
              </div>
            </div>
            <Skeleton className="h-5 w-16 rounded-full bg-slate-800" />
          </div>

          {/* Breakdown Rows */}
          <div className="p-3 lg:p-5 space-y-3">
            <div className="space-y-2 border-b border-slate-100 pb-3">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex justify-between pt-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>

            {/* Total Payable Box */}
            <div className="bg-emerald-50/80 border border-emerald-100 rounded-md p-3 text-center space-y-1.5">
              <Skeleton className="h-3 w-28 mx-auto bg-emerald-200/60" />
              <Skeleton className="h-7 w-36 mx-auto bg-emerald-200/80" />
            </div>

            {/* Actions Stepper + Button */}
            <div className="flex items-stretch gap-2.5 pt-1">
              <Skeleton className="h-10 w-24 rounded-md" />
              <Skeleton className="h-10 flex-1 rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
