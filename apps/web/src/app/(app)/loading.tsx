import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton genérico: navegação responde na hora, conteúdo hidrata depois. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 pt-6">
        <Skeleton className="h-6 w-40 rounded-full" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="bezel">
        <div className="bezel-core flex flex-col gap-4 p-6">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <div className="bezel">
        <div className="bezel-core flex flex-col gap-4 p-6">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </div>
    </div>
  );
}
