"use client";

interface PaginationProps {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  fromNum: string;
  toNum: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
}

const PAGE_SIZES = [10, 20, 30, 50];

export default function Pagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  fromNum,
  toNum,
  onFromChange,
  onToChange,
}: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
      <span>共 {total} 人</span>

      <div className="flex items-center gap-1">
        每页
        <select
          value={pageSize}
          onChange={(e) => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
          className="border rounded px-1 py-0.5 text-sm"
        >
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>{s}人/页</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1">
        编号区间
        <input
          type="text"
          value={fromNum}
          onChange={(e) => onFromChange(e.target.value)}
          placeholder="从"
          className="border rounded px-1 py-0.5 w-16 text-sm"
        />
        ~
        <input
          type="text"
          value={toNum}
          onChange={(e) => onToChange(e.target.value)}
          placeholder="至"
          className="border rounded px-1 py-0.5 w-16 text-sm"
        />
      </div>

      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
          className="px-2 py-0.5 border rounded disabled:opacity-40"
        >«</button>
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="px-2 py-0.5 border rounded disabled:opacity-40"
        >‹</button>
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
          const p = i + 1;
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`px-2 py-0.5 border rounded ${p === page ? "bg-blue-500 text-white border-blue-500" : "hover:bg-gray-50"}`}
            >
              {p}
            </button>
          );
        })}
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="px-2 py-0.5 border rounded disabled:opacity-40"
        >›</button>
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(totalPages)}
          className="px-2 py-0.5 border rounded disabled:opacity-40"
        >»</button>
      </div>

      <span>第 {page}/{totalPages} 页</span>
    </div>
  );
}
