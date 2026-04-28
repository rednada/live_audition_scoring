"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import useSWR from "swr";
import { LayoutGrid, List, LogOut, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import ActorScoreCard from "@/components/ActorScoreCard";
import Pagination from "@/components/Pagination";
import type { ScoreData } from "@/types";
import { useRouter } from "next/navigation";

interface Session {
  id: number;
  name: string;
  date: string;
  category: string;
}

interface Actor {
  id: number;
  auditionNumber: string;
  name: string;
  height: number;
  weight: number;
  hasTattoo: boolean;
  sessionId: number;
  stage: string;
  photos: { type: string; filePath: string }[];
}

interface Score {
  actorId: number;
  stars: number;
  house?: string;
  role?: string;
  note?: string;
  director: { id: number; displayName: string };
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ScoringPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"unscored" | "scored">("unscored");
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [showOthers, setShowOthers] = useState(false);

  const [selectedSession, setSelectedSession] = useState("");
  const [selectedStage, setSelectedStage] = useState("");
  const [searchNum, setSearchNum] = useState("");

  // Independent page state per tab
  const [unscoredPage, setUnscoredPage] = useState(1);
  const [scoredPage, setScoredPage] = useState(1);
  const page = activeTab === "unscored" ? unscoredPage : scoredPage;
  const setPage = activeTab === "unscored" ? setUnscoredPage : setScoredPage;

  const [pageSize, setPageSize] = useState(20);
  const [fromNum, setFromNum] = useState("");
  const [toNum, setToNum] = useState("");

  const [drafts, setDrafts] = useState<Record<number, ScoreData>>({});
  const [submitting, setSubmitting] = useState(false);
  const [userInfo, setUserInfo] = useState<{ ssoId: string; displayName: string } | null>(null);

  const debounceSyncRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const { data: sessions } = useSWR<Session[]>("/api/sessions", fetcher);

  const baseActorParams = {
    pageSize: String(pageSize),
    ...(selectedSession ? { sessionId: selectedSession } : {}),
    ...(selectedStage ? { stage: selectedStage } : {}),
    ...(fromNum ? { from: fromNum } : {}),
    ...(toNum ? { to: toNum } : {}),
    ...(searchNum ? { from: searchNum, to: searchNum } : {}),
  };

  const unscoredParams = new URLSearchParams({ ...baseActorParams, page: String(unscoredPage), excludeScored: "true" });
  const scoredParams2 = new URLSearchParams({ ...baseActorParams, page: String(scoredPage), onlyScored: "true" });

  const { data: unscoredData, mutate: mutateUnscored } = useSWR<{ actors: Actor[]; total: number }>(
    `/api/actors?${unscoredParams}`,
    fetcher,
    { refreshInterval: 0 }
  );
  const { data: scoredData, mutate: mutateScored } = useSWR<{ actors: Actor[]; total: number }>(
    `/api/actors?${scoredParams2}`,
    fetcher,
    { refreshInterval: 0 }
  );

  const scoreParams = new URLSearchParams({
    ...(selectedSession ? { sessionId: selectedSession } : {}),
    ...(selectedStage ? { stage: selectedStage } : {}),
  });

  const { data: myScores, mutate: mutateScores } = useSWR<Score[]>(
    `/api/scores?${scoreParams}`,
    fetcher,
    { refreshInterval: showOthers ? 15000 : 0 }
  );

  const { data: otherScores } = useSWR<Score[]>(
    showOthers ? `/api/scores?${scoreParams}&excludeSelf=true` : null,
    fetcher,
    { refreshInterval: 15000 }
  );

  const { data: allDirectors } = useSWR<{ id: number; displayName: string }[]>(
    showOthers ? "/api/directors" : null,
    fetcher
  );

  const otherDirectorNames = (allDirectors ?? [])
    .filter((d) => d.displayName !== userInfo?.displayName)
    .map((d) => d.displayName);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => { if (data.ssoId) setUserInfo(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedSession) params.set("sessionId", selectedSession);
    if (selectedStage) params.set("stage", selectedStage);
    fetch(`/api/drafts?${params}`)
      .then((r) => r.json())
      .then((dbDrafts: Array<{ actorId: number; data: string }>) => {
        const merged: Record<number, ScoreData> = { ...drafts };
        dbDrafts.forEach((d) => {
          if (!merged[d.actorId]) merged[d.actorId] = JSON.parse(d.data);
        });
        setDrafts(merged);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSession, selectedStage]);

  const myScoreMap: Record<number, Score> = {};
  myScores?.forEach((s) => { myScoreMap[s.actorId] = s; });

  const otherScoreMap: Record<number, Score[]> = {};
  otherScores?.forEach((s) => {
    if (!otherScoreMap[s.actorId]) otherScoreMap[s.actorId] = [];
    otherScoreMap[s.actorId].push(s);
  });

  const unscoredActors = unscoredData?.actors ?? [];
  const unscoredTotal = unscoredData?.total ?? 0;
  const scoredActors = scoredData?.actors ?? [];
  const scoredTotal = scoredData?.total ?? 0;
  const displayActors = activeTab === "unscored" ? unscoredActors : scoredActors;
  const total = activeTab === "unscored" ? unscoredTotal : scoredTotal;

  // Count of current-page unscored actors that have a draft ready to submit
  const draftCount = unscoredActors.filter((a) => drafts[a.id]?.stars).length;

  const handleDraftChange = useCallback(
    (actorId: number, data: ScoreData) => {
      setDrafts((prev) => ({ ...prev, [actorId]: data }));
      const existing = debounceSyncRef.current.get(actorId);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        if (!selectedSession) return;
        fetch("/api/drafts", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actorId,
            sessionId: parseInt(selectedSession),
            stage: selectedStage,
            data,
          }),
        }).catch(() => {});
      }, 2000);
      debounceSyncRef.current.set(actorId, timer);
    },
    [selectedSession, selectedStage]
  );

  async function handleSubmit() {
    const toSubmit = displayActors
      .filter((a) => drafts[a.id]?.stars)
      .map((a) => ({
        actorId: a.id,
        sessionId: a.sessionId,
        stage: a.stage,
        stars: drafts[a.id].stars,
        house: drafts[a.id].house,
        role: drafts[a.id].role,
        note: drafts[a.id].note,
      }));
    if (toSubmit.length === 0) return;
    setSubmitting(true);
    await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toSubmit),
    });
    setSubmitting(false);
    await Promise.all([mutateUnscored(), mutateScored(), mutateScores()]);
  }

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/director/login");
  }

  function actorCardProps(actor: Actor) {
    return {
      actor,
      initialDraft: drafts[actor.id],
      submittedScore: myScoreMap[actor.id]
        ? {
            stars: myScoreMap[actor.id].stars,
            house: myScoreMap[actor.id].house,
            role: myScoreMap[actor.id].role,
            note: myScoreMap[actor.id].note,
          }
        : undefined,
      otherScores: (otherScoreMap[actor.id] ?? []).map((s) => ({
        directorId: s.director.id,
        directorName: s.director.displayName,
        stars: s.stars,
        house: s.house,
        role: s.role,
        note: s.note,
      })),
      allDirectorNames: otherDirectorNames,
      showOthers,
      onDraftChange: handleDraftChange,
    };
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">

      {/* ── Sticky header ─────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white shadow-sm">

        {/* Row 1: Brand · Filters · Tools */}
        <div className="px-4 h-12 flex items-center gap-2 border-b border-gray-100">
          <span className="font-black text-gray-900 tracking-tight text-sm mr-1">LAS</span>

          {/* Session */}
          <select
            value={selectedSession}
            onChange={(e) => { setSelectedSession(e.target.value); setPage(1); }}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-blue-400 text-gray-700 max-w-[180px]"
          >
            <option value="">全部场次</option>
            {sessions?.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name} · {s.date}
              </option>
            ))}
          </select>

          {/* Stage */}
          <select
            value={selectedStage}
            onChange={(e) => { setSelectedStage(e.target.value); setPage(1); }}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-blue-400 text-gray-700"
          >
            <option value="">全部阶段</option>
            <option value="Preliminary">Preliminary</option>
            <option value="Call Back">Call Back</option>
          </select>

          {/* Number search */}
          <input
            type="text"
            value={searchNum}
            onChange={(e) => { setSearchNum(e.target.value); setPage(1); }}
            placeholder="编号搜索"
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 w-24 focus:outline-none focus:border-blue-400 placeholder-gray-300"
          />

          {/* Right tools */}
          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => setShowOthers((v) => !v)}
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                showOthers
                  ? "bg-blue-50 border-blue-300 text-blue-600"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              {showOthers ? <Eye size={13} /> : <EyeOff size={13} />}
              他人打分
            </button>

            <div className="w-px h-4 bg-gray-200" />

            <button
              onClick={() => setViewMode("card")}
              title="卡片视图"
              className={`p-1.5 rounded-lg border transition-colors ${viewMode === "card" ? "bg-blue-50 border-blue-300 text-blue-600" : "border-gray-200 text-gray-400 hover:border-gray-300"}`}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              title="列表视图"
              className={`p-1.5 rounded-lg border transition-colors ${viewMode === "list" ? "bg-blue-50 border-blue-300 text-blue-600" : "border-gray-200 text-gray-400 hover:border-gray-300"}`}
            >
              <List size={15} />
            </button>

            <div className="w-px h-4 bg-gray-200" />

            {userInfo && (
              <span className="text-xs text-gray-500 font-medium">{userInfo.displayName}</span>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-1.5 py-1 rounded transition-colors"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>

        {/* Row 2: Tabs · Progress */}
        <div className="px-4 flex items-center">
          <button
            onClick={() => setActiveTab("unscored")}
            className={`py-2.5 pr-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "unscored"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            未打分
            {unscoredTotal > 0 && (
              <span className={`ml-1.5 text-xs rounded-full px-1.5 py-0.5 ${
                activeTab === "unscored" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"
              }`}>
                {unscoredTotal}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("scored")}
            className={`py-2.5 pr-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "scored"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            已打分
            {scoredTotal > 0 && (
              <span className={`ml-1.5 text-xs rounded-full px-1.5 py-0.5 ${
                activeTab === "scored" ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"
              }`}>
                {scoredTotal}
              </span>
            )}
          </button>

          {/* Progress — scored / (scored + unscored) */}
          {(unscoredTotal + scoredTotal) > 0 && (
            <div className="ml-auto flex items-center gap-2.5 py-2">
              <span className="text-xs text-gray-400">
                已提交{" "}
                <span className="font-semibold text-gray-700">{scoredTotal}</span>
                <span className="text-gray-300 mx-0.5">/</span>
                {unscoredTotal + scoredTotal}
              </span>
              <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${(unscoredTotal + scoredTotal) > 0 ? Math.round((scoredTotal / (unscoredTotal + scoredTotal)) * 100) : 0}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────────── */}
      <div className="p-4">
        {displayActors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-300">
            <div className="text-5xl mb-3">📋</div>
            <div className="text-sm">
              {activeTab === "unscored" ? "当前筛选下无待打分演员" : "暂无已打分演员"}
            </div>
          </div>
        ) : viewMode === "card" ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {displayActors.map((actor) => (
              <ActorScoreCard key={actor.id} {...actorCardProps(actor)} viewMode="card" />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100 shadow-sm">
            {displayActors.map((actor) => (
              <ActorScoreCard key={actor.id} {...actorCardProps(actor)} viewMode="list" />
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > 0 && (
          <div className="mt-5 pt-4 border-t border-gray-100">
            <Pagination
              total={total}
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

      {/* ── Floating submit button ─────────────────────────────────────────────── */}
      {activeTab === "unscored" && (
        <div className="fixed bottom-6 right-6 z-30">
          <button
            onClick={handleSubmit}
            disabled={submitting || draftCount === 0}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold px-5 py-3 rounded-2xl shadow-xl shadow-blue-300/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 size={17} />
            {submitting ? "提交中..." : "提交打分"}
            {draftCount > 0 && (
              <span className="bg-white/25 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                {draftCount}
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
