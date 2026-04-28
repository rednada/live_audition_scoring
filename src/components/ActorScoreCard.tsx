"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { Star, CheckCircle2, ZoomIn, X, ChevronLeft, ChevronRight } from "lucide-react";
import useSWR from "swr";
import type { ScoreData, DirectorScore, PhotoType } from "@/types";
import { NOTE_TAGS, PHOTO_LABELS } from "@/types";

const NOTE_MAX = 30;

const HOUSE_COLORS = [
  { pill: "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100", active: "bg-violet-600 text-white border-violet-600" },
  { pill: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",     active: "bg-amber-500 text-white border-amber-500" },
  { pill: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100", active: "bg-emerald-600 text-white border-emerald-600" },
  { pill: "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100",             active: "bg-sky-600 text-white border-sky-600" },
  { pill: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100",         active: "bg-rose-600 text-white border-rose-600" },
];

function houseAbbr(name: string): string {
  return name.split(/[\s-]/)[0].slice(0, 3);
}

interface House {
  id: number;
  name: string;
  roles: { id: number; name: string }[];
}

interface Actor {
  id: number;
  auditionNumber: string;
  name: string;
  height: number;
  weight: number;
  hasTattoo: boolean;
  photos: { type: string; filePath: string }[];
}

interface ActorScoreCardProps {
  actor: Actor;
  directorName?: string;
  initialDraft?: ScoreData;
  submittedScore?: ScoreData;
  otherScores?: DirectorScore[];
  allDirectorNames?: string[];
  showOthers?: boolean;
  onDraftChange: (actorId: number, data: ScoreData) => void;
  viewMode: "card" | "list";
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ActorScoreCard({
  actor,
  initialDraft,
  submittedScore,
  otherScores = [],
  allDirectorNames = [],
  showOthers = false,
  onDraftChange,
  viewMode,
}: ActorScoreCardProps) {
  const [draft, setDraft] = useState<ScoreData>(
    submittedScore ?? initialDraft ?? { stars: 0, house: "", role: "", note: "" }
  );
  const [roleInput, setRoleInput] = useState(draft.role ?? "");
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const roleRef = useRef<HTMLDivElement>(null);

  const { data: houses } = useSWR<House[]>("/api/houses", fetcher);

  const frontPhoto = actor.photos.find((p) => p.type === "front_half");
  const isSubmitted = !!submittedScore;
  const hasDraft = !isSubmitted && draft.stars > 0;

  const selectedHouse = houses?.find((h) => h.name === draft.house);
  const filteredRoles =
    selectedHouse?.roles.filter((r) =>
      r.name.toLowerCase().includes(roleInput.toLowerCase())
    ) ?? [];

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) {
        setShowRoleDropdown(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const update = useCallback(
    (patch: Partial<ScoreData>) => {
      const next = { ...draft, ...patch };
      setDraft(next);
      onDraftChange(actor.id, next);
    },
    [draft, actor.id, onDraftChange]
  );

  function toggleNoteTag(tag: string) {
    const parts = (draft.note ?? "").split("、").map((s) => s.trim()).filter(Boolean);
    const next = parts.includes(tag) ? parts.filter((t) => t !== tag) : [...parts, tag];
    const joined = next.join("、");
    if (joined.length <= NOTE_MAX) update({ note: joined });
  }

  function handleNoteCustom(v: string) {
    const tags = (draft.note ?? "").split("、").map((s) => s.trim()).filter((s) => NOTE_TAGS.includes(s));
    const joined = [...tags, v].filter(Boolean).join("、");
    if (joined.length <= NOTE_MAX) update({ note: joined });
  }

  const noteTags = (draft.note ?? "").split("、").map((s) => s.trim()).filter((s) => NOTE_TAGS.includes(s));
  const noteCustom = (draft.note ?? "").split("、").map((s) => s.trim()).find((s) => !NOTE_TAGS.includes(s)) ?? "";
  const noteLen = (draft.note ?? "").length;

  function openLightbox() {
    if (actor.photos.length === 0) return;
    const frontIdx = actor.photos.findIndex((p) => p.type === "front_half");
    setLightboxIdx(frontIdx >= 0 ? frontIdx : 0);
    setShowLightbox(true);
  }

  // ── List view ──────────────────────────────────────────────────────────────
  if (viewMode === "list") {
    return (
      <div className={`flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-gray-50/80 border-l-4 ${
        isSubmitted ? "border-green-400 bg-green-50/20" : hasDraft ? "border-amber-400" : "border-transparent"
      }`}>
        {/* Thumbnail */}
        <div className="w-10 h-12 relative rounded-md overflow-hidden bg-gray-100 shrink-0 ring-1 ring-black/5 cursor-zoom-in"
          onClick={openLightbox}>
          {frontPhoto ? (
            <Image src={frontPhoto.filePath} alt={actor.name} fill className="object-cover object-top" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-[10px]">无</div>
          )}
        </div>

        {/* Actor info */}
        <div className="w-28 shrink-0">
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-gray-900">{actor.auditionNumber}</span>
            {isSubmitted && <CheckCircle2 size={11} className="text-green-500 shrink-0" />}
            {hasDraft && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
          </div>
          <div className="text-xs text-gray-500 truncate">{actor.name}</div>
          <div className="text-[10px] text-gray-400">
            {actor.height}·{actor.weight}
            {actor.hasTattoo && <span className="ml-0.5 text-orange-400">纹</span>}
          </div>
        </div>

        {/* Stars */}
        <div className="flex items-center gap-0.5 shrink-0">
          {[1, 2, 3].map((s) => (
            <button key={s} type="button" disabled={isSubmitted}
              onClick={() => update({ stars: draft.stars === s ? 0 : s })}
              className="disabled:cursor-default">
              <Star size={20} className={s <= draft.stars ? "fill-yellow-400 text-yellow-400" : "text-gray-200 hover:text-gray-300"} />
            </button>
          ))}
        </div>

        {/* House */}
        <div className="flex items-center gap-1 shrink-0">
          {houses?.map((h, i) => {
            const c = HOUSE_COLORS[i % HOUSE_COLORS.length];
            const isActive = draft.house === h.name;
            return (
              <button key={h.id} type="button" disabled={isSubmitted}
                onClick={() => { update({ house: isActive ? "" : h.name, role: "" }); setRoleInput(""); }}
                className={`px-1.5 py-0.5 rounded-full text-xs font-medium border transition-all disabled:cursor-default ${isActive ? c.active : c.pill}`}>
                {houseAbbr(h.name)}
              </button>
            );
          })}
        </div>

        {/* Role input */}
        <div className="relative w-24 shrink-0" ref={roleRef}>
          <input
            type="text"
            value={roleInput}
            disabled={isSubmitted || !draft.house}
            placeholder="角色..."
            onChange={(e) => { setRoleInput(e.target.value); update({ role: e.target.value }); setShowRoleDropdown(true); }}
            onFocus={() => setShowRoleDropdown(true)}
            className="w-full text-xs rounded-lg border border-gray-200 px-2 py-1 focus:outline-none focus:border-blue-400 disabled:bg-transparent disabled:border-transparent disabled:cursor-default placeholder-gray-300"
          />
          {showRoleDropdown && filteredRoles.length > 0 && (
            <div className="absolute top-full left-0 z-20 mt-0.5 bg-white border border-gray-200 rounded-lg shadow-lg max-h-36 overflow-auto w-40">
              {filteredRoles.map((r) => (
                <button key={r.id} type="button"
                  className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-blue-50"
                  onClick={() => { setRoleInput(r.name); update({ role: r.name }); setShowRoleDropdown(false); }}>
                  {r.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Note chips */}
        <div className="flex-1 min-w-0 flex flex-wrap gap-1 items-center">
          {NOTE_TAGS.slice(0, 6).map((tag) => (
            <button key={tag} type="button" disabled={isSubmitted} onClick={() => toggleNoteTag(tag)}
              className={`text-xs px-1.5 py-0.5 rounded-md border transition-colors disabled:cursor-default ${
                noteTags.includes(tag)
                  ? "bg-blue-500 text-white border-blue-500"
                  : "border-gray-200 text-gray-500 hover:border-blue-300"
              }`}>
              {tag}
            </button>
          ))}
          {noteCustom && <span className="text-xs text-gray-400 truncate max-w-[5rem]">{noteCustom}</span>}
        </div>

        {/* Other scores */}
        {showOthers && (allDirectorNames.length > 0 || otherScores.length > 0) && (
          <div className="shrink-0 border-l-2 border-blue-200 pl-3 ml-1">
            <div className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider mb-1">他人打分</div>
            <OtherScoresTable
              directorNames={allDirectorNames.length > 0 ? allDirectorNames : otherScores.map((s) => s.directorName)}
              scores={otherScores}
            />
          </div>
        )}

        {showLightbox && (
          <Lightbox photos={actor.photos} actor={actor} idx={lightboxIdx} onIdxChange={setLightboxIdx} onClose={() => setShowLightbox(false)} />
        )}
      </div>
    );
  }

  // ── Card view ───────────────────────────────────────────────────────────────
  const statusBorder = isSubmitted ? "border-green-400" : hasDraft ? "border-amber-400" : "border-gray-100";

  return (
    <>
      <div className={`bg-white rounded-xl border-2 ${statusBorder} shadow-sm overflow-hidden flex flex-col transition-colors`}>

        {/* ── Main row: photo (left) + form (right) ── */}
        <div className="flex flex-row flex-1">

          {/* Left: Photo */}
          <div
            className="relative w-24 shrink-0 bg-gray-900 cursor-zoom-in group"
            onClick={openLightbox}
          >
            {frontPhoto ? (
              <Image
                src={frontPhoto.filePath}
                alt={actor.name}
                fill
                sizes="96px"
                className="object-contain"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 text-[10px]">无照片</div>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
              <ZoomIn size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
            </div>

            {/* Status badge */}
            {isSubmitted && (
              <div className="absolute top-1.5 left-1.5 bg-green-500 rounded-full p-0.5 shadow">
                <CheckCircle2 size={12} className="text-white" />
              </div>
            )}
            {hasDraft && (
              <div className="absolute top-1.5 left-1.5 w-2.5 h-2.5 bg-amber-400 rounded-full ring-2 ring-white shadow" />
            )}

            {/* Actor info overlay */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent px-1.5 pb-1.5 pt-6">
              <div className="text-white font-bold text-[11px] leading-tight tracking-wide">{actor.auditionNumber}</div>
              <div className="text-white/80 text-[10px] truncate">{actor.name}</div>
              <div className="text-white/55 text-[9px] mt-0.5">
                {actor.height}·{actor.weight}{actor.hasTattoo ? "·纹" : ""}
              </div>
            </div>
          </div>

          {/* Right: Scoring form */}
          <div className={`flex-1 min-w-0 px-2 pt-2 pb-2.5 flex flex-col gap-1.5 ${isSubmitted ? "bg-green-50/50" : ""}`}>

            {/* Stars */}
            <div className="flex items-center gap-1">
              {[1, 2, 3].map((s) => (
                <button key={s} type="button" disabled={isSubmitted}
                  onClick={() => update({ stars: draft.stars === s ? 0 : s })}
                  className="transition-transform active:scale-90 disabled:cursor-default">
                  <Star size={20} className={s <= draft.stars
                    ? "fill-yellow-400 text-yellow-400 drop-shadow-sm"
                    : "text-gray-200 hover:text-gray-300 transition-colors"
                  } />
                </button>
              ))}
            </div>

            {/* House pills */}
            <div className="flex flex-wrap gap-1">
              {houses?.map((h, i) => {
                const c = HOUSE_COLORS[i % HOUSE_COLORS.length];
                const isActive = draft.house === h.name;
                return (
                  <button key={h.id} type="button" disabled={isSubmitted}
                    onClick={() => { update({ house: isActive ? "" : h.name, role: "" }); setRoleInput(""); }}
                    className={`px-1.5 py-0.5 rounded-full text-xs font-medium border transition-all disabled:cursor-default ${isActive ? c.active : c.pill}`}>
                    {houseAbbr(h.name)}
                  </button>
                );
              })}
            </div>

            {/* Role */}
            <div className="relative" ref={roleRef}>
              <input
                type="text"
                value={roleInput}
                disabled={isSubmitted || !draft.house}
                placeholder={draft.house ? "选择角色..." : "先选 House"}
                onChange={(e) => { setRoleInput(e.target.value); update({ role: e.target.value }); setShowRoleDropdown(true); }}
                onFocus={() => setShowRoleDropdown(true)}
                className="w-full text-xs rounded-lg border border-gray-200 px-2 py-1 focus:outline-none focus:border-blue-400 disabled:bg-transparent disabled:border-transparent disabled:text-gray-400 disabled:cursor-default placeholder-gray-300"
              />
              {showRoleDropdown && filteredRoles.length > 0 && (
                <div className="absolute top-full left-0 z-20 mt-0.5 bg-white border border-gray-200 rounded-lg shadow-lg max-h-36 overflow-auto w-full">
                  {filteredRoles.map((r) => (
                    <button key={r.id} type="button"
                      className="w-full text-left px-2 py-1.5 text-xs hover:bg-blue-50"
                      onClick={() => { setRoleInput(r.name); update({ role: r.name }); setShowRoleDropdown(false); }}>
                      {r.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Note chips */}
            <div className="flex flex-wrap gap-1">
              {NOTE_TAGS.slice(0, 3).map((tag) => (
                <button key={tag} type="button" disabled={isSubmitted} onClick={() => toggleNoteTag(tag)}
                  className={`text-xs px-1.5 py-0.5 rounded-md border transition-colors disabled:cursor-default ${
                    noteTags.includes(tag)
                      ? "bg-blue-500 text-white border-blue-500"
                      : "border-gray-200 text-gray-500 hover:border-blue-300"
                  }`}>
                  {tag}
                </button>
              ))}
            </div>

            {/* Custom note */}
            <input
              type="text"
              value={noteCustom}
              disabled={isSubmitted}
              placeholder="备注..."
              maxLength={NOTE_MAX}
              onChange={(e) => handleNoteCustom(e.target.value)}
              className="w-full text-xs border-0 border-b border-dashed border-gray-200 focus:outline-none focus:border-blue-300 bg-transparent py-0.5 placeholder-gray-300 disabled:cursor-default"
            />
            {noteLen > 0 && (
              <span className="text-[10px] text-gray-300 self-end -mt-1">{noteLen}/{NOTE_MAX}</span>
            )}
          </div>
        </div>

        {/* Others table — full width below main row */}
        {showOthers && (allDirectorNames.length > 0 || otherScores.length > 0) && (
          <div className="border-t-2 border-blue-100 bg-blue-50/40 px-2.5 pt-2 pb-2.5">
            <div className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider mb-1.5">他人打分</div>
            <OtherScoresTable
              directorNames={allDirectorNames.length > 0 ? allDirectorNames : otherScores.map((s) => s.directorName)}
              scores={otherScores}
            />
          </div>
        )}
      </div>

      {/* Lightbox */}
      {showLightbox && (
        <Lightbox
          photos={actor.photos}
          actor={actor}
          idx={lightboxIdx}
          onIdxChange={setLightboxIdx}
          onClose={() => setShowLightbox(false)}
        />
      )}
    </>
  );
}

// ── Lightbox ────────────────────────────────────────────────────────────────
function Lightbox({
  photos,
  actor,
  idx,
  onIdxChange,
  onClose,
}: {
  photos: { type: string; filePath: string }[];
  actor: { auditionNumber: string; name: string; height: number; weight: number; hasTattoo: boolean };
  idx: number;
  onIdxChange: (i: number) => void;
  onClose: () => void;
}) {
  const photo = photos[idx];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onIdxChange((idx + 1) % photos.length);
      if (e.key === "ArrowLeft") onIdxChange((idx - 1 + photos.length) % photos.length);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [idx, photos.length, onClose, onIdxChange]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/92 flex flex-col items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="flex flex-col items-center max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="w-full flex items-center justify-between mb-3">
          <div className="text-white">
            <span className="font-bold text-lg">{actor.auditionNumber}</span>
            <span className="text-white/70 ml-2">{actor.name}</span>
            <span className="text-white/40 ml-2 text-sm">{actor.height}cm · {actor.weight}kg{actor.hasTattoo ? " · 有纹身" : ""}</span>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        {/* Main image + nav */}
        <div className="relative w-full flex items-center justify-center">
          {photos.length > 1 && (
            <button
              onClick={() => onIdxChange((idx - 1 + photos.length) % photos.length)}
              className="absolute left-0 z-10 text-white/60 hover:text-white bg-black/30 hover:bg-black/50 rounded-full p-1.5 transition-all"
            >
              <ChevronLeft size={20} />
            </button>
          )}

          <div className="relative w-full max-h-[65vh] flex items-center justify-center bg-gray-900/50 rounded-xl overflow-hidden"
            style={{ height: "65vh" }}>
            <Image
              key={photo.filePath}
              src={photo.filePath}
              alt={PHOTO_LABELS[photo.type as PhotoType] ?? photo.type}
              fill
              sizes="512px"
              className="object-contain"
            />
          </div>

          {photos.length > 1 && (
            <button
              onClick={() => onIdxChange((idx + 1) % photos.length)}
              className="absolute right-0 z-10 text-white/60 hover:text-white bg-black/30 hover:bg-black/50 rounded-full p-1.5 transition-all"
            >
              <ChevronRight size={20} />
            </button>
          )}
        </div>

        {/* Photo label */}
        <div className="text-white/50 text-sm mt-2">
          {PHOTO_LABELS[photo.type as PhotoType] ?? photo.type}
          <span className="ml-2 text-white/30">{idx + 1} / {photos.length}</span>
        </div>

        {/* Thumbnail strip */}
        {photos.length > 1 && (
          <div className="flex gap-2 mt-3">
            {photos.map((p, i) => (
              <button
                key={p.type}
                onClick={() => onIdxChange(i)}
                className={`relative w-11 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                  i === idx ? "border-white scale-105" : "border-transparent opacity-50 hover:opacity-80"
                }`}
              >
                <Image src={p.filePath} alt={p.type} fill sizes="44px" className="object-cover object-top" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── OtherScoresTable ────────────────────────────────────────────────────────
function OtherScoresTable({
  directorNames,
  scores,
}: {
  directorNames: string[];
  scores: DirectorScore[];
}) {
  const scoreByName = Object.fromEntries(scores.map((s) => [s.directorName, s]));

  return (
    <div className="rounded border border-blue-200 overflow-hidden text-xs">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-blue-100/70 text-blue-500">
            <th className="text-left font-semibold py-1.5 px-2 border-r border-blue-200 w-16">导演</th>
            <th className="text-center font-semibold py-1.5 px-2 border-r border-blue-200 w-12">打分</th>
            <th className="text-left font-semibold py-1.5 px-2 border-r border-blue-200">House</th>
            <th className="text-left font-semibold py-1.5 px-2 border-r border-blue-200">Role</th>
            <th className="text-left font-semibold py-1.5 px-2">Note</th>
          </tr>
        </thead>
        <tbody>
          {directorNames.map((name, i) => {
            const s = scoreByName[name];
            return (
              <tr key={name} className={`border-t border-blue-100 ${i % 2 === 1 ? "bg-blue-50/50" : "bg-white"}`}>
                <td className="py-1.5 px-2 font-medium text-gray-700 truncate max-w-[4rem] border-r border-blue-100">{name}</td>
                <td className="py-1.5 px-2 text-center border-r border-blue-100">
                  {s ? (
                    <span className="text-yellow-500">{"★".repeat(s.stars)}<span className="text-gray-300">{"★".repeat(3 - s.stars)}</span></span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="py-1.5 px-2 text-gray-500 border-r border-blue-100">{s ? s.house || "—" : ""}</td>
                <td className="py-1.5 px-2 text-gray-500 border-r border-blue-100 truncate max-w-[5rem]">{s ? s.role || "—" : ""}</td>
                <td className="py-1.5 px-2 text-gray-500 truncate max-w-[6rem]">{s?.note ?? ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
