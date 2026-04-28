/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useMemo } from "react";
import {
  ChevronRight,
  ChevronDown,
  BookOpen,
  ArrowLeft,
  X,
  StickyNote,
  Copy,
  Eye,
  Pencil,
  Check,
} from "lucide-react";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Actor {
  id: number;
  ssoId: string;
  name: string;
  nationality: string;
  flag: string;
  height: number;
  photoUrl: string;
  hasMemo: boolean;
}

interface Role {
  id: string;
  name: string;
  homeActors: Actor[];
  swingActors: Actor[];
}

interface Show {
  id: string;
  name: string;
  landId: string;
  roles: Role[];
}

interface Land {
  id: string;
  label: string;
  shows: Show[];
}

// ── Mock Data ─────────────────────────────────────────────────────────────────

const ACTOR_POOL: { name: string; nationality: string; flag: string; gender: "men" | "women" }[] = [
  { name: "Arthur William Bennett", nationality: "UK", flag: "🇬🇧", gender: "men" },
  { name: "Oliver James Carter", nationality: "UK", flag: "🇬🇧", gender: "men" },
  { name: "Alvin Yang Chao 杨超", nationality: "China", flag: "🇨🇳", gender: "men" },
  { name: "Lily Grace Wilson", nationality: "USA", flag: "🇺🇸", gender: "women" },
  { name: "Chloe Rose Taylor", nationality: "UK", flag: "🇬🇧", gender: "women" },
  { name: "Emma Sophie Davis", nationality: "Australia", flag: "🇦🇺", gender: "women" },
  { name: "Liam Noah Johnson", nationality: "Canada", flag: "🇨🇦", gender: "men" },
  { name: "Sofia Mia Martinez", nationality: "USA", flag: "🇺🇸", gender: "women" },
  { name: "Ethan Mason Brown", nationality: "UK", flag: "🇬🇧", gender: "men" },
  { name: "Chen Wei 陈威", nationality: "China", flag: "🇨🇳", gender: "men" },
  { name: "Yuki Tanaka 田中雪", nationality: "Japan", flag: "🇯🇵", gender: "women" },
  { name: "Min Ji Park 朴敏智", nationality: "Korea", flag: "🇰🇷", gender: "women" },
  { name: "Lucas Gabriel Silva", nationality: "Brazil", flag: "🇧🇷", gender: "men" },
  { name: "Isabella Rossi", nationality: "Italy", flag: "🇮🇹", gender: "women" },
  { name: "Zoe Hannah White", nationality: "Australia", flag: "🇦🇺", gender: "women" },
  { name: "Wang Fang 王芳", nationality: "China", flag: "🇨🇳", gender: "women" },
  { name: "James Patrick Lee", nationality: "USA", flag: "🇺🇸", gender: "men" },
  { name: "Sarah Elizabeth Moore", nationality: "UK", flag: "🇬🇧", gender: "women" },
  { name: "Ryan Michael Scott", nationality: "Canada", flag: "🇨🇦", gender: "men" },
  { name: "Mei Lin Zhang 张美琳", nationality: "China", flag: "🇨🇳", gender: "women" },
  { name: "Thomas Edward Clark", nationality: "UK", flag: "🇬🇧", gender: "men" },
  { name: "Jessica Anne Harris", nationality: "USA", flag: "🇺🇸", gender: "women" },
  { name: "Marco Antonio López", nationality: "Spain", flag: "🇪🇸", gender: "men" },
  { name: "Hana Sato 佐藤花", nationality: "Japan", flag: "🇯🇵", gender: "women" },
  { name: "Kevin Andrew Young", nationality: "Canada", flag: "🇨🇦", gender: "men" },
  { name: "Anna Marie König", nationality: "Germany", flag: "🇩🇪", gender: "women" },
  { name: "Liu Yang 刘阳", nationality: "China", flag: "🇨🇳", gender: "men" },
  { name: "Charlotte Emily Green", nationality: "UK", flag: "🇬🇧", gender: "women" },
  { name: "Priya Sharma", nationality: "India", flag: "🇮🇳", gender: "women" },
  { name: "Diego Alejandro Ruiz", nationality: "Mexico", flag: "🇲🇽", gender: "men" },
];

const SHOW_A_ROLES = [
  "Prince Charming", "Cinderella", "Fairy Godmother", "Evil Stepmother",
  "Stepsister (L)", "Stepsister (R)", "Duke", "Herald", "Palace Guard L",
  "Palace Guard R", "Footman", "Lady in Waiting", "Baker", "Seamstress",
  "Coachman", "Royal Trumpeter", "Court Jester", "Knight Commander",
  "Knight #1", "Knight #2", "Knight #3", "Ensemble Lead F", "Ensemble Lead M",
  "Ensemble #1", "Ensemble #2", "Ensemble #3", "Ensemble #4", "Ensemble #5",
  "Ensemble #6", "Ensemble #7", "Ensemble #8", "Ensemble #9", "Ensemble #10",
  "Specialty Dance Lead", "Acrobat Lead", "Acrobat #1", "Acrobat #2",
  "Stilt Walker #1", "Stilt Walker #2", "Aerial Performer", "Fire Dancer",
  "Percussion Lead", "Drummer #1", "Drummer #2", "Character Mascot",
];

const GENERIC_ROLE_NAMES = [
  "Lead Character", "Supporting Lead", "Character A", "Character B",
  "Ensemble Lead", "Specialty Role", "Featured Dancer", "Acrobat",
  "Stilt Walker", "Aerial Artist", "Percussion Lead", "Mascot Character",
  "Understudy Lead", "Featured Singer",
];

function getRoleName(showId: string, index: number): string {
  if (showId === "A") return SHOW_A_ROLES[index] ?? `Ensemble #${index - 32}`;
  return GENERIC_ROLE_NAMES[index % GENERIC_ROLE_NAMES.length];
}

function dHash(n: number): number {
  let x = n ^ (n >>> 16);
  x = Math.imul(x, 0x45d9f3b);
  x = x ^ (x >>> 16);
  return Math.abs(x);
}

function generateActors(showId: string, roleIndex: number, type: "home" | "swing", count: number): Actor[] {
  const base = showId.charCodeAt(0) * 200 + roleIndex * 17 + (type === "swing" ? 1000 : 0);
  return Array.from({ length: count }, (_, i) => {
    const seed = dHash(base + i * 7);
    const poolIdx = seed % ACTOR_POOL.length;
    const pool = ACTOR_POOL[poolIdx];
    const photoNum = (dHash(base + i * 13 + 3) % 70) + 1;
    const ssoNum = 100000 + (dHash(base + i * 31 + 7) % 900000);
    return {
      id: base * 100 + i,
      ssoId: `${ssoNum}`,
      name: pool.name,
      nationality: pool.nationality,
      flag: pool.flag,
      height: 162 + (dHash(base + i + 5) % 24),
      photoUrl: `https://randomuser.me/api/portraits/${pool.gender}/${photoNum}.jpg`,
      hasMemo: dHash(base + i + 9) % 4 === 0,
    };
  });
}

const SHOW_RAW = [
  { id: "A", land: "一", roleCount: 45 },
  { id: "B", land: "二", roleCount: 6 },
  { id: "C", land: "三", roleCount: 2 },
  { id: "D", land: "四", roleCount: 2 },
  { id: "E", land: "五", roleCount: 2 },
  { id: "F", land: "六", roleCount: 13 },
  { id: "G", land: "七", roleCount: 3 },
  { id: "H", land: "八", roleCount: 6 },
  { id: "I", land: "六", roleCount: 11 },
  { id: "J", land: "九", roleCount: 5 },
  { id: "K", land: "五", roleCount: 4 },
  { id: "L", land: "七", roleCount: 5 },
  { id: "M", land: "四", roleCount: 1 },
  { id: "N", land: "九", roleCount: 6 },
  { id: "O", land: "六", roleCount: 6 },
  { id: "P", land: "九", roleCount: 5 },
  { id: "Q", land: "七", roleCount: 1 },
  { id: "R", land: "七", roleCount: 1 },
  { id: "S", land: "六", roleCount: 13 },
];

function buildData(): Land[] {
  const landMap = new Map<string, Show[]>();
  for (const raw of SHOW_RAW) {
    if (!landMap.has(raw.land)) landMap.set(raw.land, []);
    const roles: Role[] = Array.from({ length: raw.roleCount }, (_, i) => ({
      id: `${raw.id}-${i + 1}`,
      name: getRoleName(raw.id, i),
      homeActors: generateActors(raw.id, i, "home", 3 + (i % 3)),
      swingActors: generateActors(raw.id, i, "swing", 1 + (i % 2)),
    }));
    landMap.get(raw.land)!.push({ id: raw.id, name: `Show ${raw.id}`, landId: raw.land, roles });
  }
  const order = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];
  return order
    .filter((id) => landMap.has(id))
    .map((id) => ({ id, label: `乐园${id}`, shows: landMap.get(id)! }));
}

const DATA: Land[] = buildData();
const TOTAL_SHOWS = DATA.reduce((s, l) => s + l.shows.length, 0);
const TOTAL_ROLES = DATA.reduce((s, l) => l.shows.reduce((ss, sh) => ss + sh.roles.length, 0) + s, 0);

// ── Preview Modal ─────────────────────────────────────────────────────────────

function PreviewModal({ actor, label, onClose }: { actor: Actor; label: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl overflow-hidden w-full max-w-xs shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <img
            src={actor.photoUrl}
            alt={actor.name}
            className="w-full aspect-[4/5] object-cover object-top"
          />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 bg-black/40 rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
            <p className="text-xs font-medium text-gray-300">{label}</p>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <p className="font-bold text-gray-900 text-base leading-snug">{actor.name}</p>
            {actor.hasMemo && <StickyNote className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">国籍</p>
              <p className="text-gray-700">{actor.flag} {actor.nationality}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">身高</p>
              <p className="text-gray-700">{actor.height} cm</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-400 mb-0.5">SSO ID</p>
              <p className="font-mono text-gray-800 text-sm">{actor.ssoId}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Actor Card ────────────────────────────────────────────────────────────────

function ActorCard({
  actor,
  index,
  type,
  fullWidth = false,
}: {
  actor: Actor;
  index: number;
  type: "home" | "swing";
  fullWidth?: boolean;
}) {
  const label = type === "home" ? `Home #${index + 1}` : `Swing #${index + 1}`;
  const [copied, setCopied] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  function handleCopySSO() {
    navigator.clipboard.writeText(actor.ssoId).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      {previewing && (
        <PreviewModal actor={actor} label={label} onClose={() => setPreviewing(false)} />
      )}
      <div
        className={`bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm ${
          fullWidth ? "w-full" : "flex-shrink-0 w-40 md:w-44"
        }`}
      >
        {/* Label bar with action buttons */}
        <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-gray-100">
          <span className="text-xs text-gray-400 font-medium tracking-wide">{label}</span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={handleCopySSO}
              title={`复制SSO: ${actor.ssoId}`}
              className={`p-1 rounded hover:bg-gray-100 transition-colors ${
                copied ? "text-green-500" : "text-gray-400 hover:text-gray-700"
              }`}
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </button>
            <button
              onClick={() => setPreviewing(true)}
              title="预览演员信息"
              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <Eye className="w-3 h-3" />
            </button>
            <Link
              href={`/admin/actors/${actor.id}/edit`}
              title="编辑演员信息"
              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <Pencil className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Photo */}
        <div className="relative w-full" style={{ paddingBottom: "125%" }}>
          <img
            src={actor.photoUrl}
            alt={actor.name}
            className="absolute inset-0 w-full h-full object-cover object-top"
            loading="lazy"
          />
        </div>

        {/* Info */}
        <div className="px-3 py-2.5">
          <div className="flex items-start gap-1">
            <p className="text-xs font-semibold text-gray-900 leading-snug flex-1 min-w-0">
              {actor.name}
            </p>
            {actor.hasMemo && (
              <StickyNote className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400 flex-wrap">
            <span>{actor.flag} {actor.nationality}</span>
            <span className="text-gray-200">|</span>
            <span>{actor.height}cm</span>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Cast Toggle ───────────────────────────────────────────────────────────────

function CastToggle({
  value,
  onChange,
}: {
  value: "home" | "swing";
  onChange: (v: "home" | "swing") => void;
}) {
  return (
    <div className="flex items-center gap-0.5 bg-gray-100 rounded-full p-1 w-fit">
      {(["home", "swing"] as const).map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all ${
            value === t
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          {t === "home" ? "HOME CAST" : "Swing CAST"}
        </button>
      ))}
    </div>
  );
}

// ── Role Grid ─────────────────────────────────────────────────────────────────

function RoleGrid({
  show,
  selectedRoleId,
  onSelectRole,
  onClearRole,
}: {
  show: Show;
  selectedRoleId: string | null;
  onSelectRole: (id: string) => void;
  onClearRole: () => void;
}) {
  const manyRoles = show.roles.length > 10;

  const grid = (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 p-1">
      {show.roles.map((role) => {
        const active = selectedRoleId === role.id;
        return (
          <button
            key={role.id}
            onClick={() => onSelectRole(role.id)}
            className={`text-left p-3 rounded-xl border transition-all ${
              active
                ? "border-gray-900 bg-gray-900 text-white shadow-sm"
                : "border-gray-200 bg-white hover:border-gray-400 hover:shadow-sm text-gray-700"
            }`}
          >
            <p className={`text-xs font-semibold leading-snug ${active ? "text-white" : "text-gray-800"}`}>
              {role.name}
            </p>
            <div className={`flex items-center gap-2 mt-2 text-xs ${active ? "text-gray-300" : "text-gray-400"}`}>
              <span className={`px-1.5 py-0.5 rounded text-xs ${active ? "bg-white/10" : "bg-gray-50"}`}>
                H·{role.homeActors.length}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-xs ${active ? "bg-white/10" : "bg-gray-50"}`}>
                S·{role.swingActors.length}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">{show.name}</span>
          <span className="text-xs text-gray-400">{show.roles.length} roles</span>
          {manyRoles && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              向下滚动查看更多
            </span>
          )}
        </div>
        {selectedRoleId && (
          <button
            onClick={onClearRole}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 px-2 py-1"
          >
            <X className="w-3.5 h-3.5" />
            取消选择
          </button>
        )}
      </div>

      {manyRoles ? (
        <div className="relative">
          <div className="max-h-52 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50/50">
            {grid}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none rounded-b-xl" />
        </div>
      ) : (
        <div className="rounded-xl border border-gray-100 bg-gray-50/50">
          {grid}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type MobileLevel = "lands" | "shows" | "roles" | "actors";

export default function CastingBookPage() {
  const [selectedLandId, setSelectedLandId] = useState<string | null>(DATA[0]?.id ?? null);
  const [selectedShowId, setSelectedShowId] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [castType, setCastType] = useState<"home" | "swing">("home");
  const [mobileLevel, setMobileLevel] = useState<MobileLevel>("lands");

  const selectedLand = useMemo(() => DATA.find((l) => l.id === selectedLandId) ?? null, [selectedLandId]);
  const selectedShow = useMemo(
    () => (selectedShowId ? DATA.flatMap((l) => l.shows).find((s) => s.id === selectedShowId) ?? null : null),
    [selectedShowId]
  );
  const selectedRole = useMemo(
    () => (selectedRoleId && selectedShow ? selectedShow.roles.find((r) => r.id === selectedRoleId) ?? null : null),
    [selectedRoleId, selectedShow]
  );
  const actors = useMemo(
    () => (selectedRole ? (castType === "home" ? selectedRole.homeActors : selectedRole.swingActors) : []),
    [selectedRole, castType]
  );

  function selectLand(landId: string) {
    setSelectedLandId(landId);
    setSelectedShowId(null);
    setSelectedRoleId(null);
  }

  function selectShow(showId: string) {
    const land = DATA.find((l) => l.shows.some((s) => s.id === showId));
    if (land) setSelectedLandId(land.id);
    setSelectedShowId(showId);
    setSelectedRoleId(null);
    setMobileLevel("roles");
  }

  function selectRole(roleId: string) {
    setSelectedRoleId(roleId === selectedRoleId ? null : roleId);
    setCastType("home");
    setMobileLevel("actors");
  }

  function goBack() {
    if (mobileLevel === "actors") {
      setMobileLevel("roles");
      setSelectedRoleId(null);
    } else if (mobileLevel === "roles") {
      setMobileLevel("shows");
      setSelectedShowId(null);
    } else if (mobileLevel === "shows") {
      setMobileLevel("lands");
      setSelectedLandId(null);
    }
  }

  // ── Mobile breadcrumb ─────────────────────────────────────────────────────

  const MobileBreadcrumb = mobileLevel !== "lands" && (
    <div className="bg-gray-50 border-b border-gray-100 px-4 py-2 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap">
      <button
        onClick={() => setMobileLevel("lands")}
        className="text-xs text-gray-400 hover:text-gray-700 flex-shrink-0"
      >
        All Lands
      </button>
      {selectedLand && (
        <>
          <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
          <button
            onClick={() => { setMobileLevel("shows"); setSelectedShowId(null); }}
            className={`text-xs flex-shrink-0 ${mobileLevel === "shows" ? "text-gray-900 font-semibold" : "text-gray-400 hover:text-gray-700"}`}
          >
            {selectedLand.label}
          </button>
        </>
      )}
      {selectedShow && (
        <>
          <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
          <button
            onClick={() => { setMobileLevel("roles"); setSelectedRoleId(null); }}
            className={`text-xs flex-shrink-0 ${mobileLevel === "roles" ? "text-gray-900 font-semibold" : "text-gray-400 hover:text-gray-700"}`}
          >
            {selectedShow.name}
          </button>
        </>
      )}
      {selectedRole && (
        <>
          <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
          <span className="text-xs text-gray-900 font-semibold flex-shrink-0">{selectedRole.name}</span>
        </>
      )}
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 flex-shrink-0">
        <div className="h-14 px-4 md:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            {mobileLevel !== "lands" && (
              <button onClick={goBack} className="md:hidden text-gray-500 hover:text-gray-900 mr-1">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <BookOpen className="w-5 h-5 text-gray-600" />
            <span className="font-bold text-gray-900 tracking-tight">Casting Book</span>
          </div>
          <div className="hidden md:flex items-center gap-5 text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />
              {DATA.length} Lands
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />
              {TOTAL_SHOWS} Shows
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />
              {TOTAL_ROLES} Roles
            </span>
          </div>
        </div>
      </header>

      {/* ── Desktop Layout ───────────────────────────────────────────────── */}
      <div className="hidden md:block flex-1 p-6 lg:p-8 max-w-screen-2xl mx-auto w-full">

        {/* Filter section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">

          {/* Land tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {DATA.map((land) => (
              <button
                key={land.id}
                onClick={() => selectLand(land.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedLandId === land.id
                    ? "bg-gray-900 text-white shadow-sm"
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                }`}
              >
                {land.label}
                <span className={`ml-1.5 text-xs ${selectedLandId === land.id ? "text-gray-400" : "text-gray-400"}`}>
                  {land.shows.length}
                </span>
              </button>
            ))}
          </div>

          {/* Show chips */}
          {selectedLand && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2.5">Show</p>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-wrap">
                {selectedLand.shows.map((show) => (
                  <button
                    key={show.id}
                    onClick={() => selectShow(show.id)}
                    className={`flex-shrink-0 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                      selectedShowId === show.id
                        ? "border-gray-900 bg-gray-900/5 text-gray-900"
                        : "border-gray-200 bg-white text-gray-500 hover:border-gray-400 hover:text-gray-800"
                    }`}
                  >
                    {show.name}
                    <span className="ml-1.5 text-xs text-gray-400">{show.roles.length}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Role grid */}
          {selectedShow && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2.5">Role</p>
              <RoleGrid
                show={selectedShow}
                selectedRoleId={selectedRoleId}
                onSelectRole={selectRole}
                onClearRole={() => setSelectedRoleId(null)}
              />
            </div>
          )}
        </div>

        {/* Actor panel */}
        {selectedRole ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-gray-900">{selectedRole.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {selectedRole.homeActors.length} Home · {selectedRole.swingActors.length} Swing
                </p>
              </div>
              <CastToggle value={castType} onChange={setCastType} />
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-5 px-5">
              {actors.map((actor, i) => (
                <ActorCard key={actor.id} actor={actor} index={i} type={castType} />
              ))}
              {actors.length === 0 && (
                <p className="text-gray-300 text-sm py-10">No actors assigned to this cast</p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-gray-300">
            {selectedShow ? (
              <>
                <ChevronDown className="w-10 h-10 mb-3 text-gray-200" />
                <p className="text-sm font-medium text-gray-400">从上方选择一个角色</p>
                <p className="text-xs text-gray-300 mt-1">{selectedShow.roles.length} roles in {selectedShow.name}</p>
              </>
            ) : (
              <>
                <BookOpen className="w-12 h-12 mb-4" />
                <p className="text-sm font-medium text-gray-400">请先选择 Land 和 Show</p>
                <p className="text-xs text-gray-300 mt-1">{TOTAL_SHOWS} shows · {TOTAL_ROLES} roles total</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Mobile Layout ──────────────────────────────────────────────────── */}
      <div className="md:hidden flex-1 flex flex-col min-h-0">
        {MobileBreadcrumb}

        {/* Lands list */}
        {mobileLevel === "lands" && (
          <div className="p-4 space-y-2 overflow-y-auto">
            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-3">
              {DATA.length} Lands
            </p>
            {DATA.map((land) => {
              const totalRoles = land.shows.reduce((s, sh) => s + sh.roles.length, 0);
              return (
                <button
                  key={land.id}
                  onClick={() => { setSelectedLandId(land.id); setMobileLevel("shows"); }}
                  className="w-full flex items-center justify-between px-4 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm text-left active:scale-[0.98] transition-transform"
                >
                  <div>
                    <p className="font-bold text-gray-900 text-base">{land.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {land.shows.length} {land.shows.length === 1 ? "show" : "shows"} · {totalRoles} roles
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300" />
                </button>
              );
            })}
          </div>
        )}

        {/* Shows list */}
        {mobileLevel === "shows" && selectedLand && (
          <div className="p-4 space-y-2 overflow-y-auto">
            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-3">
              {selectedLand.shows.length} Shows
            </p>
            {selectedLand.shows.map((show) => (
              <button
                key={show.id}
                onClick={() => selectShow(show.id)}
                className="w-full flex items-center justify-between px-4 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm text-left active:scale-[0.98] transition-transform"
              >
                <div>
                  <p className="font-bold text-gray-900">{show.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{show.roles.length} roles</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300" />
              </button>
            ))}
          </div>
        )}

        {/* Roles grid */}
        {mobileLevel === "roles" && selectedShow && (
          <div className="p-4 overflow-y-auto">
            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-3">
              {selectedShow.roles.length} Roles
            </p>
            <div className="grid grid-cols-2 gap-2">
              {selectedShow.roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => selectRole(role.id)}
                  className="text-left p-3 bg-white rounded-xl border border-gray-100 shadow-sm active:scale-[0.97] transition-transform"
                >
                  <p className="text-sm font-semibold text-gray-800 leading-snug">{role.name}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">H·{role.homeActors.length}</span>
                    <span className="text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">S·{role.swingActors.length}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actors — 2-column grid */}
        {mobileLevel === "actors" && selectedRole && (
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 pt-4 pb-2">
              <h3 className="font-bold text-gray-900 text-base">{selectedRole.name}</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {selectedRole.homeActors.length} Home · {selectedRole.swingActors.length} Swing
              </p>
            </div>
            <div className="px-4 pb-3">
              <CastToggle value={castType} onChange={setCastType} />
            </div>
            {actors.length === 0 ? (
              <p className="text-gray-300 text-sm py-8 px-4">No actors assigned</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 px-4 pb-6">
                {actors.map((actor, i) => (
                  <ActorCard key={actor.id} actor={actor} index={i} type={castType} fullWidth />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
