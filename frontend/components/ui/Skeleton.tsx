export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800 ${className ?? ""}`} />
  );
}
