import { PageHeroSkeleton, ProductGridSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <>
      <PageHeroSkeleton />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <ProductGridSkeleton />
      </div>
    </>
  );
}
