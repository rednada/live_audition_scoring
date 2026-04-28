import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 w-full max-w-sm p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Live Audition Scoring</h1>
        <p className="text-gray-500 text-sm mb-8">请选择您的角色入口</p>

        <div className="flex flex-col gap-3">
          <Link
            href="/director/login"
            className="block w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            导演打分入口
          </Link>
          <Link
            href="/casting/login"
            className="block w-full py-3 px-4 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            甄选团队入口
          </Link>
          <Link
            href="/admin/qrcodes"
            className="block w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            管理员 · 二维码管理
          </Link>
        </div>
      </div>
    </div>
  );
}
