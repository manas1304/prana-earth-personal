export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-[#1a82c4] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-gray-500">Verifying access...</p>
      </div>
    </div>
  );
}