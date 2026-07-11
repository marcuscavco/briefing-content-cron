import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton fiel à home: clique na nav responde na hora. */
export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-5 pt-6">
        <Skeleton className="h-6 w-44 rounded-full" />
        <div className="flex flex-wrap items-end justify-between gap-6">
          <Skeleton className="h-14 w-80 max-w-full" />
          <Skeleton className="h-11 w-44 rounded-full" />
        </div>
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-12 w-full" />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        <div className="bezel md:col-span-5">
          <div className="bezel-core flex h-full flex-col justify-between gap-8 p-7">
            <Skeleton className="h-3 w-32" />
            <div className="flex flex-col gap-3">
              <Skeleton className="h-20 w-24" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 md:col-span-7">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bezel">
              <div className="bezel-core flex h-full flex-col justify-between gap-6 p-6">
                <Skeleton className="h-3 w-20" />
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-10 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
          ))}
          <div className="bezel sm:col-span-3">
            <div className="bezel-core flex items-center justify-between px-6 py-4">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-7 w-32 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bezel">
            <div className="bezel-core flex h-full flex-col justify-between gap-8 p-6">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        ))}
      </div>

      <div className="bezel">
        <div className="bezel-core flex flex-col gap-4 p-6">
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
}
