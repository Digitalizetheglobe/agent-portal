import React from 'react';
import { Skeleton } from '../ui/skeleton';

// Placeholder shown while a lazy page chunk or the initial data is loading.
const PageSkeleton = () => (
  <div className="space-y-6" aria-busy="true" aria-label="Loading">
    <div className="space-y-2">
      <Skeleton className="h-7 w-56" />
      <Skeleton className="h-4 w-80 max-w-full" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-28 rounded-xl" />
      ))}
    </div>
    <Skeleton className="h-72 rounded-xl" />
  </div>
);

export default PageSkeleton;
