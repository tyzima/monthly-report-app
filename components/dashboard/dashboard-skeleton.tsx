import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
    return (
        <div className="flex flex-col gap-8">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-[125px] rounded-lg" />
                <Skeleton className="h-[125px] rounded-lg" />
                <Skeleton className="h-[125px] rounded-lg" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Skeleton className="h-[300px] rounded-lg lg:col-span-4" />
                <Skeleton className="h-[300px] rounded-lg lg:col-span-3" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-[350px] rounded-lg lg:col-span-2" />
            </div>
        </div>
    )
}
