// Skeleton UI rendered immediately by Next.js while the projects page
// loads on the server. This is shown the instant the user navigates to
// /projects — no waiting on the client-side fetch to finish before the
// browser paints anything.

function CardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col animate-pulse">
      <div className="h-48 w-full bg-gray-200" />
      <div className="p-5 flex-1 space-y-3">
        <div className="h-4 w-3/4 bg-gray-200 rounded" />
        <div className="h-3 w-1/3 bg-gray-100 rounded" />
        <div className="h-3 w-full bg-gray-100 rounded" />
        <div className="h-3 w-5/6 bg-gray-100 rounded" />
        <div className="pt-4 mt-2 border-t border-gray-100 flex justify-between items-center">
          <div className="h-6 w-1/3 bg-gray-200 rounded" />
          <div className="h-3 w-20 bg-gray-100 rounded" />
        </div>
      </div>
    </div>
  );
}

export default function ProjectsLoading() {
  return (
    <div className="bg-gray-50/50 min-h-screen pb-16">
      {/* Header skeleton */}
      <div className="max-w-[1200px] mx-auto px-6 pt-10 pb-6">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-96 bg-gray-100 rounded mt-2 animate-pulse" />
        <div className="mt-6 max-w-xl h-10 bg-gray-100 rounded-xl animate-pulse" />
      </div>

      {/* Body skeleton */}
      <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-4 gap-8 mt-4">
        {/* Filters skeleton */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 h-fit shadow-sm space-y-2 animate-pulse">
          <div className="h-4 w-20 bg-gray-200 rounded mb-4" />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-full bg-gray-100 rounded-lg" />
          ))}
        </div>

        {/* Grid skeleton */}
        <div className="lg:col-span-3">
          <div className="h-3 w-32 bg-gray-100 rounded mb-4 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}