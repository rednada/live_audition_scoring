"use client";
import { useState } from "react";
import useSWR from "swr";
import Image from "next/image";
import { Download, LogOut, Pencil, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import StarRating from "@/components/StarRating";
import HouseRoleSelect from "@/components/HouseRoleSelect";
import Pagination from "@/components/Pagination";

interface Session {
  id: number;
  name: string;
  date: string;
  category: string;
}

interface ActorResult {
  id: number;
  auditionNumber: string;
  name: string;
  height: number;
  weight: number;
  hasTattoo: boolean;
  avgScore: number;
  photos: { type: string; filePath: string }[];
  scores: {
    stars: number;
    house?: string;
    role?: string;
    note?: string;
    director: { id: number; displayName: string };
  }[];
  wrapUp: {
    house?: string;
    role?: string;
    note?: string;
    action?: string;
  } | null;
}

interface EditState {
  actorId: number;
  house: string;
  role: string;
  note: string;
  action: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ResultsPage() {
  const router = useRouter();
  const [selectedSession, setSelectedSession] = useState("");
  const [selectedStage, setSelectedStage] = useState("Preliminary");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [fromNum, setFromNum] = useState("");
  const [toNum, setToNum] = useState("");
  const [editing, setEditing] = useState<EditState | null>(null);

  const { data: sessions } = useSWR<Session[]>("/api/sessions", fetcher);

  const { data: results, mutate } = useSWR<ActorResult[]>(
    selectedSession
      ? `/api/wrap-up?sessionId=${selectedSession}&stage=${selectedStage}`
      : null,
    fetcher,
    { refreshInterval: 30000 }
  );

  // Get unique director names
  const directorNames = Array.from(
    new Set(results?.flatMap((r) => r.scores.map((s) => s.director.displayName)) ?? [])
  ).sort();

  const filtered = results?.filter((r) => {
    if (fromNum && r.auditionNumber < fromNum) return false;
    if (toNum && r.auditionNumber > toNum) return false;
    return true;
  });

  const paginated = filtered?.slice((page - 1) * pageSize, page * pageSize);

  function startEdit(actor: ActorResult) {
    setEditing({
      actorId: actor.id,
      house: actor.wrapUp?.house ?? "",
      role: actor.wrapUp?.role ?? "",
      note: actor.wrapUp?.note ?? "",
      action: actor.wrapUp?.action ?? "",
    });
  }

  async function saveEdit(actor: ActorResult) {
    if (!editing || editing.actorId !== actor.id) return;
    await fetch("/api/wrap-up", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: parseInt(selectedSession),
        stage: selectedStage,
        ...editing,
        actorId: actor.id,
      }),
    });
    setEditing(null);
    mutate();
  }

  async function handleExport() {
    const params = new URLSearchParams({ sessionId: selectedSession, stage: selectedStage });
    window.open(`/api/export?${params}`, "_blank");
  }

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/casting/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="font-semibold text-gray-800">Live Audition Scoring — 甄选团队</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={!selectedSession}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-40"
          >
            <Download size={14} />
            导出 Excel
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 px-2"
          >
            <LogOut size={14} />
            退出
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b px-4 py-3 flex flex-wrap gap-3 items-center">
        <div>
          <label className="text-xs text-gray-500 mr-1">甄选场次</label>
          <select
            value={selectedSession}
            onChange={(e) => { setSelectedSession(e.target.value); setPage(1); }}
            className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-400"
          >
            <option value="">请选择场次</option>
            {sessions?.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name} - {s.date}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500 mr-1">甄选阶段</label>
          <select
            value={selectedStage}
            onChange={(e) => { setSelectedStage(e.target.value); setPage(1); }}
            className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-400"
          >
            <option value="Preliminary">Preliminary</option>
            <option value="Call Back">Call Back</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="p-4 overflow-x-auto">
        {!selectedSession ? (
          <div className="text-center text-gray-400 py-20">请选择甄选场次</div>
        ) : !results ? (
          <div className="text-center text-gray-400 py-20">加载中...</div>
        ) : results.length === 0 ? (
          <div className="text-center text-gray-400 py-20">暂无已打分演员</div>
        ) : (
          <table className="w-full min-w-max text-sm bg-white border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50 text-gray-600 text-xs">
              <tr>
                <th className="px-3 py-2 text-left sticky left-0 bg-gray-50 z-10">演员</th>
                {directorNames.map((name) => (
                  <th key={name} className="px-3 py-2 text-center">{name}</th>
                ))}
                <th className="px-3 py-2 text-center bg-blue-50 text-blue-700">Wrap Up</th>
                <th className="px-3 py-2 text-center bg-green-50 text-green-700">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated?.map((actor) => {
                const frontPhoto = actor.photos.find((p) => p.type === "front_half");
                const isEditing = editing?.actorId === actor.id;

                return (
                  <tr key={actor.id} className="hover:bg-gray-50">
                    {/* Actor info */}
                    <td className="px-3 py-2 sticky left-0 bg-white z-10">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 relative rounded overflow-hidden bg-gray-100 shrink-0">
                          {frontPhoto && (
                            <Image src={frontPhoto.filePath} alt={actor.name} fill className="object-cover" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-blue-600">{actor.auditionNumber}</div>
                          <div className="text-gray-700">{actor.name}</div>
                          <div className="text-xs text-gray-400">{actor.height}cm / {actor.weight}kg</div>
                        </div>
                      </div>
                    </td>

                    {/* Per-director scores */}
                    {directorNames.map((name) => {
                      const score = actor.scores.find((s) => s.director.displayName === name);
                      return (
                        <td key={name} className="px-3 py-2 text-center align-top">
                          {score ? (
                            <div className="space-y-0.5">
                              <StarRating value={score.stars} readOnly size={14} />
                              {score.house && <div className="text-xs text-gray-500">{score.house}</div>}
                              {score.role && <div className="text-xs text-gray-500">{score.role}</div>}
                              {score.note && <div className="text-xs text-gray-400 truncate max-w-24">{score.note}</div>}
                            </div>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Wrap Up */}
                    <td className="px-3 py-2 bg-blue-50 align-top">
                      {isEditing ? (
                        <div className="space-y-2 min-w-48">
                          <div className="flex items-center gap-1 text-xs font-medium text-blue-700">
                            平均分: {actor.avgScore}
                          </div>
                          <HouseRoleSelect
                            house={editing.house}
                            role={editing.role}
                            onHouseChange={(h) => setEditing((p) => p ? { ...p, house: h, role: "" } : p)}
                            onRoleChange={(r) => setEditing((p) => p ? { ...p, role: r } : p)}
                          />
                          <textarea
                            value={editing.note}
                            onChange={(e) => setEditing((p) => p ? { ...p, note: e.target.value } : p)}
                            placeholder="备注..."
                            rows={2}
                            className="w-full text-xs border rounded px-2 py-1 focus:outline-none focus:border-blue-400"
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={() => saveEdit(actor)}
                              className="flex items-center gap-0.5 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                            >
                              <Check size={10} /> 保存
                            </button>
                            <button
                              onClick={() => setEditing(null)}
                              className="flex items-center gap-0.5 px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded hover:bg-gray-300"
                            >
                              <X size={10} /> 取消
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-0.5 min-w-32">
                          <div className="text-xs font-medium text-blue-700">平均分: {actor.avgScore}</div>
                          {actor.wrapUp?.house && <div className="text-xs text-gray-600">{actor.wrapUp.house}</div>}
                          {actor.wrapUp?.role && <div className="text-xs text-gray-600">{actor.wrapUp.role}</div>}
                          {actor.wrapUp?.note && <div className="text-xs text-gray-400">{actor.wrapUp.note}</div>}
                          <button
                            onClick={() => startEdit(actor)}
                            className="flex items-center gap-0.5 text-xs text-blue-500 hover:underline mt-1"
                          >
                            <Pencil size={10} /> 编辑
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-3 py-2 bg-green-50 align-top">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editing.action}
                          onChange={(e) => setEditing((p) => p ? { ...p, action: e.target.value } : p)}
                          placeholder="Action..."
                          className="text-xs border rounded px-2 py-1 w-24 focus:outline-none focus:border-green-400"
                        />
                      ) : (
                        <span className="text-xs text-gray-600">{actor.wrapUp?.action ?? "-"}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {results && results.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <Pagination
              total={filtered?.length ?? 0}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              fromNum={fromNum}
              toNum={toNum}
              onFromChange={setFromNum}
              onToChange={setToNum}
            />
          </div>
        )}
      </div>
    </div>
  );
}
