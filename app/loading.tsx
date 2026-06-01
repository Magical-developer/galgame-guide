export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-[--accent] border-t-transparent" />
      <p className="text-sm tracking-[0.2em] text-white/50">加载中...</p>
    </div>
  );
}
