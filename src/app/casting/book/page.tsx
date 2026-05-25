/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useMemo, useRef, useCallback, createContext, useContext } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  BookOpen, X, Pencil, Upload, Play, ChevronDown, ChevronUp,
  ArrowUp, ArrowDown, ArrowUpDown, LayoutGrid, List,
  RotateCcw, Eye, Users, Film, Plus,
  ChevronLeft, ChevronRight, Camera, Download, FileSpreadsheet,
  Filter, Check, Menu, ArrowLeft,
} from "lucide-react";
import * as XLSX from "xlsx";
import BottomSheet from "@/components/BottomSheet";
import useDocumentTitle from "@/lib/useDocumentTitle";

// ── Types ──────────────────────────────────────────────────────────────────

interface MediaFile { type: "photo" | "video"; url: string; duration?: string; note?: string }
interface SkillEntry { id: string; type: string; skill: string }
interface ShowRoleRecord {
  id: string; show: string; role: string; roleType: "home" | "swing";
  date: string; status: "active" | "inactive";
}
interface EventRecord { id: string; eventName: string; roleName: string; startDate: string; endDate: string; status: "active" | "inactive" }

type ActorStatus = "Active" | "Inactive";
const ACTOR_STATUSES: ActorStatus[] = ["Active", "Inactive"];
const STATUS_BADGE: Record<ActorStatus, { bg: string; text: string; ring: string; dot: string }> = {
  "Active":   { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", dot: "bg-emerald-500" },
  "Inactive": { bg: "bg-gray-100",   text: "text-gray-600",    ring: "ring-gray-200",    dot: "bg-gray-400" },
};

const INACTIVE_REASONS = ["No show", "转出", "已离职", "其它"] as const;
type InactiveReason = typeof INACTIVE_REASONS[number];

// Status override state: actor objects come from module-level constants so
// in-session edits are kept here and merged on read.
const StatusCtx = createContext<{
  statusOf: (a: Actor) => ActorStatus;
  setStatusFor: (ids: number[], status: ActorStatus) => void;
}>({ statusOf: (a) => a.status ?? "Active", setStatusFor: () => {} });
const useActorStatus = () => useContext(StatusCtx);

function StatusBadge({ status, size = "sm" }: { status: ActorStatus; size?: "xs" | "sm" }) {
  const c = STATUS_BADGE[status];
  const dim = size === "xs"
    ? "text-[9px] px-1.5 py-[1px] gap-1"
    : "text-[10px] px-1.5 py-0.5 gap-1";
  return (
    <span className={`inline-flex items-center rounded-full font-medium leading-tight ${c.bg} ${c.text} ${dim}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status}
    </span>
  );
}

// Offboarding flow (current → Inactive). The doc requires picking a reason
// before the status flips, so we always route both single-row and batch
// "mark inactive" through this dialog. To reactivate, picking Active commits
// immediately (no reason needed).
function OffboardingDialog({ count, onClose, onConfirm }: {
  count: number; onClose: () => void; onConfirm: (reason: InactiveReason) => void;
}) {
  const [reason, setReason] = useState<InactiveReason>("已离职");
  const title = count === 1 ? "Mark as Inactive" : `Mark ${count} performers as Inactive`;
  const body = (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 leading-relaxed">
        Choose a reason. The performer&apos;s status will be set to Inactive; their event experience and skills will be preserved.
      </p>
      <div className="space-y-2">
        {INACTIVE_REASONS.map((r) => (
          <label key={r} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${reason === r ? "border-brand-300 bg-brand-50/40" : "border-gray-200 hover:bg-gray-50"}`}>
            <input type="radio" checked={reason === r} onChange={() => setReason(r)} className="accent-brand-500" />
            <span className="text-sm text-gray-800">{r}</span>
          </label>
        ))}
      </div>
    </div>
  );
  return (
    <>
      <div className="hidden md:flex fixed inset-0 z-[60] items-center justify-center bg-black/40 p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-[92vw] max-w-sm" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">{title}</h2>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>
          </div>
          <div className="px-5 py-4">{body}</div>
          <div className="flex justify-end gap-2 px-5 pb-5">
            <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={() => { onConfirm(reason); onClose(); }} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium">Mark Inactive</button>
          </div>
        </div>
      </div>
      <div className="md:hidden">
        <BottomSheet open onClose={onClose} title={title}
          footer={
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">Cancel</button>
              <button onClick={() => { onConfirm(reason); onClose(); }} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium">Mark Inactive</button>
            </div>
          }
        >{body}</BottomSheet>
      </div>
    </>
  );
}

// Status mark menu — popover on desktop, bottom sheet on mobile.
// Active → Inactive opens the offboarding reason picker; Inactive → Active commits directly.
function MarkStatusMenu({ anchor, current, count, onClose, onPick }: {
  anchor?: { top: number; left: number };
  current?: ActorStatus;
  count?: number;
  onClose: () => void;
  onPick: (s: ActorStatus) => void;
}) {
  return (
    <>
      {/* Desktop popover */}
      <div className="hidden md:block">
        <div className="fixed inset-0 z-40" onClick={onClose} />
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 w-44"
          style={{ top: anchor?.top ?? 80, left: anchor?.left ?? 80 }}
          onClick={(e) => e.stopPropagation()}
        >
          {count !== undefined && (
            <div className="px-3 py-1.5 text-[11px] text-gray-400 border-b border-gray-100">
              Mark {count} performer{count === 1 ? "" : "s"}
            </div>
          )}
          {ACTOR_STATUSES.map((s) => {
            const active = current === s;
            const c = STATUS_BADGE[s];
            return (
              <button key={s} onClick={() => { onPick(s); onClose(); }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs hover:bg-gray-50 ${active ? "bg-brand-50/40" : ""}`}>
                <span className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                  <span className="text-gray-700">{s}</span>
                </span>
                {active && <Check className="w-3.5 h-3.5 text-brand-500" />}
              </button>
            );
          })}
        </div>
      </div>
      {/* Mobile bottom sheet */}
      <div className="md:hidden">
        <BottomSheet open onClose={onClose} title={count !== undefined ? `Mark ${count} performer${count === 1 ? "" : "s"}` : "Mark Status"}>
          <div className="py-1">
            {ACTOR_STATUSES.map((s) => {
              const active = current === s;
              const c = STATUS_BADGE[s];
              return (
                <button key={s} onClick={() => { onPick(s); onClose(); }}
                  className={`w-full flex items-center justify-between gap-3 px-1 py-3 border-b border-gray-50 ${active ? "bg-brand-50/40" : ""}`}>
                  <span className="flex items-center gap-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                    <span className="text-sm text-gray-800">{s}</span>
                  </span>
                  {active && <Check className="w-4 h-4 text-brand-500" />}
                </button>
              );
            })}
          </div>
        </BottomSheet>
      </div>
    </>
  );
}

interface Actor {
  id: number; ssoId: string; name: string; nationality: string; flag: string;
  gender?: "men" | "women";
  height: number; weight: number; photoUrl: string;
  homeShow?: string; homeRole?: string;
  status?: ActorStatus;
  inactiveReason?: InactiveReason;
  // Some imported records use a phone number in lieu of SSO until binding completes.
  pendingPhone?: string;
  skillEntries?: SkillEntry[];
  mediaFiles?: MediaFile[]; showRoleRecords?: ShowRoleRecord[]; eventRecords?: EventRecord[];
}

interface Role { id: string; name: string; headCount: number; homeActors: Actor[]; swingActors: Actor[] }
interface Show { id: string; name: string; roles: Role[] }
interface Land { id: string; label: string; shows: Show[] }

// ── Skillset Categories ────────────────────────────────────────────────────

const SKILLSET_CATEGORIES: { type: string; skills: string[] }[] = [
  { type: "演唱", skills: ["美声", "流行"] },
  { type: "舞蹈", skills: ["现代", "踢踏", "芭蕾", "爵士", "流行", "民族", "古典", "啦啦队", "Popping", "Breaking", "Hip And HOP", "Locking", "拉丁舞", "街舞", "体操"] },
  { type: "武术", skills: ["双截棍", "散打", "跆拳道", "套路", "舞旗", "拳", "舞剑"] },
  { type: "表演", skills: ["舞台表演", "舞台剧表演", "音乐剧表演", "主持", "影视表演", "人偶表演", "戏剧表演"] },
  { type: "乐器", skills: ["古筝", "吉他", "民族打击乐", "鼓", "号", "管", "木琴", "笛", "贝斯", "琴", "马林巴琴"] },
  { type: "特技/杂技", skills: ["空翻", "威亚", "高跷", "吊环", "高空特技", "肩上芭蕾", "跑酷", "花球", "绸吊"] },
  { type: "其它", skills: ["配音", "瑜伽", "轮滑", "书法", "拳击", "人物模仿", "魔术", "气球", "其它"] },
];

const SKILL_TAG_COLORS: Record<string, string> = {
  "演唱": "bg-violet-100 text-violet-700",
  "舞蹈": "bg-pink-100 text-pink-700",
  "武术": "bg-red-100 text-red-700",
  "表演": "bg-amber-100 text-amber-700",
  "乐器": "bg-yellow-100 text-yellow-700",
  "特技/杂技": "bg-emerald-100 text-emerald-700",
  "其它": "bg-gray-100 text-gray-600",
};

// ── Mock Data ──────────────────────────────────────────────────────────────

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

const CONTRACT_DATES = ["2024-11-03", "2025-08-11", "2025-03-22", "2025-06-15", "2026-01-01", "2025-12-31", "2026-03-15", "2025-09-30"];
const SWING_SHOWS = ["UOP", "UCHMMG", "TSMMG", "RPTEA", "PL"];
const SWING_ROLES = ["Parade Wushu", "Dragon Dance", "Ollivanders", "Raptor Encounter", "Main Stage Cast", "Fan Dance", "Frog Choir", "Stilt Walkers"];
const MEDIA_NOTES = ["Front pose, natural lighting", "Character makeup rehearsal", "Training reel clip", "Stage performance", "", "", "Showcase 2024", ""];

function dHash(n: number): number {
  let x = n ^ (n >>> 16);
  x = Math.imul(x, 0x45d9f3b);
  x = x ^ (x >>> 16);
  return Math.abs(x);
}

// Status distribution for mock data: ~85% Active so users can still see the
// Inactive state in filtering / batch flows without staging data manually.
function genActorStatus(seed: number): ActorStatus {
  const h = dHash(seed * 71) % 100;
  return h < 85 ? "Active" : "Inactive";
}

function genSkillEntries(seed: number): SkillEntry[] {
  const count = 2 + (dHash(seed * 3) % 4);
  const entries: SkillEntry[] = [];
  for (let i = 0; i < count; i++) {
    const catIdx = dHash(seed * 11 + i) % SKILLSET_CATEGORIES.length;
    const cat = SKILLSET_CATEGORIES[catIdx];
    const skillIdx = dHash(seed * 17 + i) % cat.skills.length;
    const id = `sk-${seed}-${i}`;
    if (!entries.find((e) => e.type === cat.type && e.skill === cat.skills[skillIdx])) {
      entries.push({ id, type: cat.type, skill: cat.skills[skillIdx] });
    }
  }
  return entries;
}

function genActors(seed: number, count: number): Actor[] {
  return Array.from({ length: count }, (_, i) => {
    const h = dHash(seed * 31 + i * 17);
    const pool = ACTOR_POOL[h % ACTOR_POOL.length];
    const photoNum = (dHash(seed * 13 + i * 7) % 70) + 1;
    const height = 162 + (dHash(seed + i + 5) % 24);
    const weight = 50 + (dHash(seed + i + 3) % 30);
    return {
      id: seed * 100 + i,
      ssoId: `${20010000 + (dHash(seed * 5 + i) % 990000)}`,
      name: pool.name, nationality: pool.nationality, flag: pool.flag,
      gender: pool.gender,
      height, weight,
      photoUrl: `https://randomuser.me/api/portraits/${pool.gender}/${photoNum}.jpg`,
      status: genActorStatus(seed * 100 + i),
      skillEntries: genSkillEntries(seed * 100 + i),
    };
  });
}

function genShowRoleRecords(seed: number, primaryShow: string, primaryRole: string, primaryDate: string): ShowRoleRecord[] {
  const swingCount = dHash(seed * 7) % 4;
  const records: ShowRoleRecord[] = [
    { id: `sr-${seed}-home`, show: primaryShow, role: primaryRole, roleType: "home", date: primaryDate, status: "active" },
  ];
  for (let i = 0; i < swingCount; i++) {
    const h = dHash(seed * 11 + i);
    const daysAgo = (h % 365) + 30;
    const date = new Date(Date.now() - daysAgo * 86400000).toISOString().split("T")[0];
    records.push({
      id: `sr-${seed}-sw${i}`,
      show: SWING_SHOWS[h % SWING_SHOWS.length],
      role: SWING_ROLES[dHash(seed * 3 + i) % SWING_ROLES.length],
      roleType: "swing",
      date,
      status: (h % 5 === 0 ? "inactive" : "active"),
    });
  }
  return records;
}

function genEventRecords(seed: number): EventRecord[] {
  const count = (dHash(seed * 5) % 4) + 1;
  return Array.from({ length: count }, (_, i) => {
    const h = dHash(seed * 13 + i);
    const daysAgoStart = (h % 730) + 60;
    const duration = (dHash(seed * 19 + i) % 90) + 3;
    const startMs = Date.now() - daysAgoStart * 86400000;
    const endMs = startMs + duration * 86400000;
    const eventOpt = EVENT_OPTIONS[h % EVENT_OPTIONS.length];
    const roleIdx = dHash(seed * 7 + i) % eventOpt.roles.length;
    return {
      id: `ev-${seed}-${i}`,
      eventName: eventOpt.event,
      roleName: eventOpt.roles[roleIdx],
      startDate: new Date(startMs).toISOString().split("T")[0],
      endDate: new Date(endMs).toISOString().split("T")[0],
      status: (h % 5 === 0 ? "inactive" : "active") as "active" | "inactive",
    };
  });
}

function makeRole(id: string, name: string, homeSeed: number, homeCount: number, swingSeed: number, swingCount: number): Role {
  const vacancy = dHash(homeSeed * 37) % 6;
  return {
    id, name,
    headCount: homeCount + vacancy,
    homeActors: genActors(homeSeed, homeCount),
    swingActors: genActors(swingSeed, swingCount),
  };
}

const DATA: Land[] = [{
  id: "ftp", label: "Full Time Performer",
  shows: [
    { id: "uop", name: "UOP", roles: [
      makeRole("uop-pw", "Parade Wushu", 101, 5, 102, 2),
      makeRole("uop-pv", "Parade Viper", 103, 8, 104, 3),
      makeRole("uop-dragon", "Dragon Dance", 105, 12, 106, 4),
      makeRole("uop-acrobat", "Acrobat Troupe", 107, 10, 108, 3),
      makeRole("uop-fan", "Fan Dance", 109, 20, 110, 5),
      makeRole("uop-drum", "Drum Corps", 111, 15, 112, 4),
      makeRole("uop-lion", "Lion Dance", 113, 8, 114, 2),
      makeRole("uop-ribbon", "Ribbon Ensemble", 115, 18, 116, 5),
      makeRole("uop-stilt", "Stilt Walkers", 117, 6, 118, 2),
      makeRole("uop-float", "Float Performers", 119, 57, 120, 12),
    ]},
    { id: "uchmmg", name: "UCHMMG", roles: [
      makeRole("uchmmg-ollivanders", "Ollivanders", 201, 16, 202, 3),
      makeRole("uchmmg-conductor", "Conductor", 203, 3, 204, 1),
      makeRole("uchmmg-triwizard", "Triwizard Spirit Rally", 205, 18, 206, 4),
      makeRole("uchmmg-frog", "Frog Choir", 207, 9, 208, 2),
      makeRole("uchmmg-wand", "Wand Ceremony", 209, 9, 210, 2),
    ]},
    { id: "tsmmg", name: "TSMMG", roles: [
      makeRole("tsmmg-raptor", "Raptor Encounter", 301, 31, 302, 8),
      makeRole("tsmmg-tf", "Transformers", 303, 23, 304, 6),
      makeRole("tsmmg-po", "Po Live", 305, 4, 306, 1),
      makeRole("tsmmg-baby", "Baby Raptor", 307, 3, 308, 1),
      makeRole("tsmmg-veloci", "Velocicoaster Crew", 309, 10, 310, 3),
    ]},
    { id: "rptea", name: "RPTEA", roles: [
      makeRole("rptea-knights", "Knights Tournament", 401, 45, 402, 10),
      makeRole("rptea-dragon", "Dragon Show", 403, 30, 404, 8),
      makeRole("rptea-royal", "Royal Procession", 405, 60, 406, 15),
      makeRole("rptea-jester", "Jester Performance", 407, 20, 408, 5),
      makeRole("rptea-guard", "Castle Guard", 409, 71, 410, 18),
    ]},
    { id: "pl", name: "PL", roles: [
      makeRole("pl-main", "Main Stage Cast", 501, 25, 502, 6),
      makeRole("pl-street", "Street Performers", 503, 20, 504, 5),
      makeRole("pl-parade", "Parade Lead", 505, 15, 506, 4),
      makeRole("pl-greet", "Meet & Greet", 507, 11, 508, 3),
    ]},
  ],
}];

// ── Event Experience preset enum (per 0514 doc) ──────────────────────────
const EVENT_OPTIONS: { event: string; roles: string[] }[] = [
  { event: "2025 Hua Pi", roles: ["纸扎人", "黑白无常", "打更人", "狐妖"] },
  { event: "2025 House NO.81", roles: ["导演", "浴缸鬼", "马桶鬼"] },
  { event: "2006 Spring", roles: ["Kevin", "Bob", "Stuart", "Alex"] },
];
const EVENT_NAME_LIST = EVENT_OPTIONS.map((e) => e.event);
function rolesForEvent(name: string): string[] {
  return EVENT_OPTIONS.find((e) => e.event === name)?.roles ?? [];
}

const SHOW_ROLE_PAIRS = [
  { show: "UOP", role: "Parade Wushu" }, { show: "UOP", role: "Parade Viper" },
  { show: "UOP", role: "Dragon Dance" }, { show: "UCHMMG", role: "Ollivanders" },
  { show: "UCHMMG", role: "Conductor" }, { show: "UCHMMG", role: "Triwizard Spirit Rally" },
  { show: "UCHMMG", role: "Frog Choir" }, { show: "TSMMG", role: "Raptor Encounter" },
  { show: "TSMMG", role: "Transformers" }, { show: "TSMMG", role: "Po Live" },
  { show: "RPTEA", role: "Knights Tournament" }, { show: "PL", role: "Main Stage Cast" },
  { show: "PL", role: "Parade Lead" },
];

function genPerformer(seed: number): Actor {
  const h = dHash(seed * 31);
  const pool = ACTOR_POOL[h % ACTOR_POOL.length];
  const pair = SHOW_ROLE_PAIRS[dHash(seed * 7) % SHOW_ROLE_PAIRS.length];
  const photoNum = (dHash(seed * 13) % 70) + 1;
  // 0522 spec: Attachment = photo gallery only (3~4 per actor typically)
  const mediaFiles: MediaFile[] = Array.from({ length: 3 + (dHash(seed * 2) % 2) }, (_, i) => ({
    type: "photo" as const,
    url: `https://randomuser.me/api/portraits/${pool.gender}/${((photoNum + i) % 70) + 1}.jpg`,
    note: MEDIA_NOTES[dHash(seed * 29 + i) % MEDIA_NOTES.length],
  }));
  const height = 160 + (dHash(seed) % 26);
  const weight = 48 + (dHash(seed * 2) % 35);
  const contractEndDate = CONTRACT_DATES[dHash(seed * 3) % CONTRACT_DATES.length];
  return {
    id: 9000 + seed, ssoId: `2001${String(7000 + dHash(seed * 19) % 3000)}`,
    name: pool.name, nationality: pool.nationality, flag: pool.flag,
    gender: pool.gender,
    height, weight,
    photoUrl: `https://randomuser.me/api/portraits/${pool.gender}/${photoNum}.jpg`,
    homeShow: pair.show, homeRole: pair.role,
    status: genActorStatus(9000 + seed),
    skillEntries: genSkillEntries(seed),
    mediaFiles,
    showRoleRecords: genShowRoleRecords(seed, pair.show, pair.role, contractEndDate),
    eventRecords: genEventRecords(seed),
  };
}

const PERFORMERS: Actor[] = Array.from({ length: 80 }, (_, i) => genPerformer(i + 1));

// Card-view actors (in DATA) carry only the minimal fields generated by genActors.
// When opened in the detail drawer they need to look just as rich as roster actors,
// so we backfill homeShow/Role from the surrounding context and synthesize the
// rest deterministically from the actor's id.
function enrichActor(a: Actor, showName: string, roleName: string): Actor {
  const seed = a.id;
  const photoNum = (dHash(seed * 13) % 70) + 1;
  const gender = a.gender ?? "men";
  const mediaFiles: MediaFile[] = a.mediaFiles ?? Array.from({ length: 3 + (dHash(seed * 2) % 2) }, (_, i) => ({
    type: "photo" as const,
    url: `https://randomuser.me/api/portraits/${gender}/${((photoNum + i) % 70) + 1}.jpg`,
    note: MEDIA_NOTES[dHash(seed * 29 + i) % MEDIA_NOTES.length],
  }));
  const fallbackDate = CONTRACT_DATES[dHash(seed * 3) % CONTRACT_DATES.length];
  return {
    ...a,
    homeShow: a.homeShow ?? showName,
    homeRole: a.homeRole ?? roleName,
    status: a.status ?? genActorStatus(seed),
    mediaFiles,
    showRoleRecords: a.showRoleRecords ?? genShowRoleRecords(seed, showName, roleName, fallbackDate),
    eventRecords: a.eventRecords ?? genEventRecords(seed),
  };
}

function findActorById(id: number): Actor | null {
  const fromPerformers = PERFORMERS.find((p) => p.id === id);
  if (fromPerformers) return fromPerformers;
  for (const land of DATA) {
    for (const show of land.shows) {
      for (const role of show.roles) {
        const inHome = role.homeActors.find((x) => x.id === id);
        if (inHome) return enrichActor(inHome, show.name, role.name);
        const inSwing = role.swingActors.find((x) => x.id === id);
        if (inSwing) return enrichActor(inSwing, show.name, role.name);
      }
    }
  }
  return null;
}

const ALL_ACTORS_BY_SSO: Actor[] = (() => {
  const map = new Map<number, Actor>();
  PERFORMERS.forEach((p) => map.set(p.id, p));
  for (const land of DATA) {
    for (const show of land.shows) {
      for (const role of show.roles) {
        role.homeActors.forEach((a) => map.set(a.id, enrichActor(a, show.name, role.name)));
        role.swingActors.forEach((a) => map.set(a.id, enrichActor(a, show.name, role.name)));
      }
    }
  }
  return [...map.values()].sort((a, b) => a.ssoId.localeCompare(b.ssoId));
})();

// ── Shared: Paginator ─────────────────────────────────────────────────────

function Paginator({ page, totalPages, pageSize, pageSizeOptions, totalItems, onPageChange, onPageSizeChange }: {
  page: number; totalPages: number; pageSize: number; pageSizeOptions: number[];
  totalItems: number; onPageChange: (p: number) => void; onPageSizeChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-2.5 border-t border-gray-100 bg-white flex-shrink-0">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>{totalItems} total</span>
        <select value={pageSize} onChange={(e) => { onPageSizeChange(+e.target.value); onPageChange(1); }}
          className="h-7 px-1.5 border border-gray-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-200">
          {pageSizeOptions.map((n) => <option key={n} value={n}>{n} / page</option>)}
        </select>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
          className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-xs text-gray-600 px-2 min-w-[60px] text-center">{page} / {Math.max(1, totalPages)}</span>
        <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
          className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors">
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Lightbox ───────────────────────────────────────────────────────────────

function Lightbox({ files, initialIndex, onClose }: { files: MediaFile[]; initialIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(initialIndex);
  const file = files[idx];
  return (
    <div className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center" onClick={onClose}>
      <button onClick={(e) => { e.stopPropagation(); setIdx((i) => Math.max(0, i - 1)); }} disabled={idx === 0}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white disabled:opacity-30 transition-colors">
        <ArrowUp className="w-5 h-5 -rotate-90" />
      </button>
      <div className="max-w-2xl max-h-[80vh] relative" onClick={(e) => e.stopPropagation()}>
        {file.type === "video" ? (
          <div className="relative">
            <img src={file.url} alt="" className="max-h-[80vh] max-w-full object-contain rounded-xl" />
            <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
              <div className="w-16 h-16 bg-white/30 rounded-full flex items-center justify-center">
                <Play className="w-8 h-8 text-white fill-white ml-1" />
              </div>
            </div>
            {file.duration && <span className="absolute bottom-3 left-3 text-xs text-white bg-black/60 px-1.5 py-0.5 rounded">{file.duration}</span>}
          </div>
        ) : (
          <img src={file.url} alt="" className="max-h-[80vh] max-w-full object-contain rounded-xl" />
        )}
        {file.note && (
          <p className="mt-2 text-xs text-gray-300 text-center px-4">{file.note}</p>
        )}
      </div>
      <button onClick={(e) => { e.stopPropagation(); setIdx((i) => Math.min(files.length - 1, i + 1)); }} disabled={idx === files.length - 1}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white disabled:opacity-30 transition-colors">
        <ArrowDown className="w-5 h-5 -rotate-90" />
      </button>
      <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors">
        <X className="w-5 h-5" />
      </button>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-gray-400">{idx + 1} / {files.length}</div>
    </div>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────

function ConfirmDialog({ title, message, confirmLabel = "Confirm", onConfirm, onCancel }: {
  title: string; message: string; confirmLabel?: string;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 pt-5 pb-4">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">{message}</p>
        </div>
        <div className="flex justify-end gap-2 px-6 pb-5">
          <button onClick={onCancel}
            className="px-4 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={onConfirm}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition-colors">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ── Section Header ─────────────────────────────────────────────────────────

function SectionHeader({ title, count, editing, onToggleCollapse, collapsed, onEdit, onSave, onCancel, onAdd, addLabel, mobileReadonly }: {
  title: string; count?: number; editing: boolean;
  onToggleCollapse: () => void; collapsed: boolean;
  onEdit?: () => void; onSave?: () => void; onCancel?: () => void;
  onAdd?: () => void; addLabel?: string;
  mobileReadonly?: boolean;
}) {
  const editClasses = mobileReadonly ? "hidden md:flex" : "flex";
  return (
    <div className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={onToggleCollapse}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-900">{title}</span>
        {count !== undefined && (
          <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">{count}</span>
        )}
      </div>
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        {!editing && !collapsed && onAdd && (
          <button onClick={onAdd}
            className={`${editClasses} items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium px-2 py-1 rounded hover:bg-brand-50 transition-colors`}>
            <Plus className="w-3 h-3" />{addLabel ?? "Add"}
          </button>
        )}
        {!editing && !collapsed && onEdit && (
          <button onClick={onEdit}
            className={`${editClasses} items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium px-2 py-1 rounded hover:bg-gray-100 transition-colors`}>
            <Pencil className="w-3 h-3" />Edit
          </button>
        )}
        {editing && (
          <>
            <button onClick={onCancel}
              className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-gray-600 hover:bg-white transition-colors">Cancel</button>
            <button onClick={onSave}
              className="flex items-center gap-1 text-xs px-2.5 py-1 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors">
              <Check className="w-3 h-3" />Save
            </button>
          </>
        )}
        <button onClick={onToggleCollapse} className="ml-1 p-0.5">
          {collapsed ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
        </button>
      </div>
    </div>
  );
}

// ── Filter Panel (shared by Card View & Roster View) ──────────────────────

interface Filters {
  performer: string;
  heightMin: string; heightMax: string;
  weightMin: string; weightMax: string;
  gender: string;
  skillType: string; skillSub: string;
  homeShow: string; homeRole: string;
  swingShow: string; swingRole: string;
  eventName: string; eventRoleName: string;
  nationality: string;
  status: ActorStatus | "All";
}

const DEFAULT_FILTER_STATUS: ActorStatus = "Active";
const EMPTY_FILTERS: Filters = {
  performer: "",
  heightMin: "", heightMax: "", weightMin: "", weightMax: "",
  gender: "", skillType: "", skillSub: "",
  homeShow: "", homeRole: "", swingShow: "", swingRole: "",
  eventName: "", eventRoleName: "",
  nationality: "",
  status: DEFAULT_FILTER_STATUS,
};

function hasAnyFilter(f: Filters): boolean {
  return Object.entries(f).some(([k, v]) => {
    if (k === "status") return v !== DEFAULT_FILTER_STATUS;
    return v !== "";
  });
}

function countActiveFilters(f: Filters): number {
  let n = 0;
  for (const [k, v] of Object.entries(f)) {
    if (k === "status") {
      if (v !== DEFAULT_FILTER_STATUS) n++;
    } else if (v !== "") n++;
  }
  return n;
}

function actorMatchesFilters(a: Actor, f: Filters, statusOf?: (a: Actor) => ActorStatus): boolean {
  if (f.performer) {
    const lq = f.performer.toLowerCase();
    if (!a.name.toLowerCase().includes(lq) && !a.ssoId.includes(lq)) return false;
  }
  if (f.heightMin && a.height < +f.heightMin) return false;
  if (f.heightMax && a.height > +f.heightMax) return false;
  if (f.weightMin && a.weight < +f.weightMin) return false;
  if (f.weightMax && a.weight > +f.weightMax) return false;
  if (f.gender) {
    const g = f.gender === "Male" ? "men" : f.gender === "Female" ? "women" : "";
    if (g && a.gender !== g) return false;
  }
  if (f.skillType && !a.skillEntries?.some((e) => e.type === f.skillType && (!f.skillSub || e.skill === f.skillSub))) return false;
  if (f.homeShow && a.homeShow !== f.homeShow) return false;
  if (f.homeRole && a.homeRole !== f.homeRole) return false;
  if (f.swingShow && !a.showRoleRecords?.some((r) => r.status === "active" && r.roleType === "swing" && r.show === f.swingShow)) return false;
  if (f.swingRole && !a.showRoleRecords?.some((r) => r.status === "active" && r.roleType === "swing" && r.role === f.swingRole)) return false;
  if (f.eventName || f.eventRoleName) {
    const hit = a.eventRecords?.some((e) => e.status === "active"
      && (!f.eventName || e.eventName === f.eventName)
      && (!f.eventRoleName || e.roleName === f.eventRoleName));
    if (!hit) return false;
  }
  if (f.nationality && a.nationality !== f.nationality) return false;
  if (f.status !== "All") {
    const cur = statusOf ? statusOf(a) : (a.status ?? "Active");
    if (cur !== f.status) return false;
  }
  return true;
}

const ALL_SHOWS = DATA.flatMap((l) => l.shows);
const ALL_NATIONALITIES = [...new Set(ACTOR_POOL.map((a) => a.nationality))].sort();

type StringFilterKey = {
  [K in keyof Filters]: Filters[K] extends string ? K : never
}[keyof Filters];

function FilterPanel({ filters, onChange, onClose }: {
  filters: Filters; onChange: (next: Filters) => void; onClose: () => void;
}) {
  const set = (k: StringFilterKey, v: string) => onChange({ ...filters, [k]: v });
  const skillsForType = SKILLSET_CATEGORIES.find((c) => c.type === filters.skillType)?.skills ?? [];
  const rolesForShow = (showName: string) => ALL_SHOWS.find((s) => s.name === showName)?.roles ?? [];

  const fieldCls = "h-9 px-2.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-200 text-gray-700 placeholder:text-gray-300 w-full";
  const lblCls = "block text-xs text-gray-500 mb-1";

  const renderShowRolePair = (showKey: StringFilterKey, roleKey: StringFilterKey, showLabel: string) => (
    <div className="sm:col-span-2">
      <label className={lblCls}>{showLabel}</label>
      <div className="grid grid-cols-2 gap-1.5">
        <select value={filters[showKey]} onChange={(e) => onChange({ ...filters, [showKey]: e.target.value, [roleKey]: "" })} className={fieldCls}>
          <option value="">请选择</option>
          {ALL_SHOWS.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>
        <select value={filters[roleKey]} onChange={(e) => set(roleKey, e.target.value)} disabled={!filters[showKey]} className={fieldCls + " disabled:opacity-50"}>
          <option value="">请选择</option>
          {rolesForShow(filters[showKey]).map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
        </select>
      </div>
    </div>
  );

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-sm mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <div>
          <label className={lblCls}>Performer</label>
          <input value={filters.performer} onChange={(e) => set("performer", e.target.value)} placeholder="请输入SSO/姓名" className={fieldCls} />
        </div>
        <div>
          <label className={lblCls}>Height Range</label>
          <div className="grid grid-cols-2 gap-1.5">
            <input value={filters.heightMin} onChange={(e) => set("heightMin", e.target.value)} placeholder="cm" type="number" className={fieldCls} />
            <input value={filters.heightMax} onChange={(e) => set("heightMax", e.target.value)} placeholder="cm" type="number" className={fieldCls} />
          </div>
        </div>
        <div>
          <label className={lblCls}>Weight Range</label>
          <div className="grid grid-cols-2 gap-1.5">
            <input value={filters.weightMin} onChange={(e) => set("weightMin", e.target.value)} placeholder="kg" type="number" className={fieldCls} />
            <input value={filters.weightMax} onChange={(e) => set("weightMax", e.target.value)} placeholder="kg" type="number" className={fieldCls} />
          </div>
        </div>
        <div>
          <label className={lblCls}>Gender</label>
          <select value={filters.gender} onChange={(e) => set("gender", e.target.value)} className={fieldCls}>
            <option value="">All</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
        <div>
          <label className={lblCls}>Skillset</label>
          <div className="grid grid-cols-2 gap-1.5">
            <select value={filters.skillType} onChange={(e) => onChange({ ...filters, skillType: e.target.value, skillSub: "" })} className={fieldCls}>
              <option value="">Category</option>
              {SKILLSET_CATEGORIES.map((c) => <option key={c.type} value={c.type}>{c.type}</option>)}
            </select>
            <select value={filters.skillSub} onChange={(e) => set("skillSub", e.target.value)} disabled={!filters.skillType} className={fieldCls + " disabled:opacity-50"}>
              <option value="">Subcategory</option>
              {skillsForType.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {renderShowRolePair("homeShow", "homeRole", "Home Show & Role")}
        {renderShowRolePair("swingShow", "swingRole", "Swing Show & Role")}
        <div className="sm:col-span-2">
          <label className={lblCls}>Event Experience</label>
          <div className="grid grid-cols-2 gap-1.5">
            <select value={filters.eventName}
              onChange={(e) => onChange({ ...filters, eventName: e.target.value, eventRoleName: "" })}
              className={fieldCls}>
              <option value="">Event Name</option>
              {EVENT_NAME_LIST.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <select value={filters.eventRoleName} onChange={(e) => set("eventRoleName", e.target.value)}
              disabled={!filters.eventName}
              className={fieldCls + " disabled:opacity-50"}>
              <option value="">Role Name</option>
              {rolesForEvent(filters.eventName).map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={lblCls}>Nationality</label>
          <select value={filters.nationality} onChange={(e) => set("nationality", e.target.value)} className={fieldCls}>
            <option value="">请选择</option>
            {ALL_NATIONALITIES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label className={lblCls}>Status</label>
          <select value={filters.status} onChange={(e) => onChange({ ...filters, status: e.target.value as Filters["status"] })} className={fieldCls}>
            <option value="All">All</option>
            {ACTOR_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        {hasAnyFilter(filters) ? (
          <button onClick={() => onChange(EMPTY_FILTERS)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors">
            <RotateCcw className="w-3 h-3" />Reset
          </button>
        ) : <span />}
        <button onClick={onClose} className="text-sm text-brand-500 hover:text-brand-700 font-medium transition-colors">Close</button>
      </div>
    </div>
  );
}

// ── Basic Info — mobile-only sub page ──────────────────────────────────────

function BasicInfoMobile({ actor, headshotUrl, onBack }: {
  actor: Actor; headshotUrl: string; onBack: () => void;
}) {
  const { statusOf } = useActorStatus();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: actor.name,
    gender: actor.gender,
    nationality: actor.nationality,
    height: String(actor.height),
    weight: String(actor.weight),
  });

  const readOnlyFields: { label: string; value: string }[] = [
    { label: "SSO", value: actor.ssoId },
    { label: "Home Show", value: actor.homeShow ?? "—" },
    { label: "Home Role", value: actor.homeRole ?? "—" },
  ];

  function handleSave() {
    // commit draft (demo: just close edit mode)
    setEditing(false);
  }

  return (
    <div className="md:hidden fixed inset-0 z-[55] bg-white flex flex-col">
      <div className="flex-shrink-0 h-12 flex items-center px-2 border-b border-gray-100 bg-white">
        <button onClick={onBack} aria-label="Back"
          className="p-2 -ml-1 rounded-md text-gray-600 hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="ml-1 text-sm font-semibold text-gray-900">Basic Info</span>
        <div className="ml-auto flex items-center gap-2 pr-1">
          {editing ? (
            <>
              <button onClick={() => { setDraft({ name: actor.name, gender: actor.gender, nationality: actor.nationality, height: String(actor.height), weight: String(actor.weight) }); setEditing(false); }}
                className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg">Cancel</button>
              <button onClick={handleSave}
                className="px-3 py-1.5 text-xs text-white bg-brand-500 rounded-lg font-medium">Save</button>
            </>
          ) : (
            <button onClick={() => setEditing(true)}
              className="px-3 py-1.5 text-xs text-brand-600 border border-brand-200 rounded-lg font-medium flex items-center gap-1">
              <Pencil className="w-3 h-3" />Edit
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center gap-3 px-4 py-4 bg-gray-50 border-b border-gray-100">
          <img src={headshotUrl} alt={actor.name}
            className="w-14 h-14 rounded-full object-cover object-top ring-2 ring-white shadow-sm" />
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-gray-900 truncate">{actor.name}</p>
            <p className="text-xs text-gray-400 font-mono">{actor.ssoId}</p>
          </div>
          <StatusBadge status={statusOf(actor)} />
        </div>
        <ul className="divide-y divide-gray-100">
          {/* SSO — always read-only */}
          <li className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-xs text-gray-400 flex-shrink-0">SSO</span>
            <span className="text-sm text-gray-800 text-right truncate font-mono">{actor.ssoId}</span>
          </li>
          {/* Editable fields */}
          <li className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-xs text-gray-400 flex-shrink-0">Name</span>
            {editing ? (
              <input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                className="text-sm text-gray-800 text-right border border-gray-200 rounded-lg px-2 py-1 w-40 focus:outline-none focus:ring-2 focus:ring-brand-200" />
            ) : (
              <span className="text-sm text-gray-800 text-right truncate">{draft.name}</span>
            )}
          </li>
          <li className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-xs text-gray-400 flex-shrink-0">Gender</span>
            {editing ? (
              <select value={draft.gender} onChange={(e) => setDraft((d) => ({ ...d, gender: e.target.value as "men" | "women" }))}
                className="text-sm text-gray-800 text-right border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-brand-200">
                <option value="men">Male</option>
                <option value="women">Female</option>
              </select>
            ) : (
              <span className="text-sm text-gray-800 text-right truncate">{draft.gender === "men" ? "Male" : draft.gender === "women" ? "Female" : "—"}</span>
            )}
          </li>
          <li className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-xs text-gray-400 flex-shrink-0">Nationality</span>
            {editing ? (
              <input value={draft.nationality} onChange={(e) => setDraft((d) => ({ ...d, nationality: e.target.value }))}
                className="text-sm text-gray-800 text-right border border-gray-200 rounded-lg px-2 py-1 w-40 focus:outline-none focus:ring-2 focus:ring-brand-200" />
            ) : (
              <span className="text-sm text-gray-800 text-right truncate">{`${actor.flag} ${draft.nationality}`}</span>
            )}
          </li>
          <li className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-xs text-gray-400 flex-shrink-0">Height</span>
            {editing ? (
              <div className="flex items-center gap-1">
                <input value={draft.height} onChange={(e) => setDraft((d) => ({ ...d, height: e.target.value }))}
                  type="number" className="text-sm text-gray-800 text-right border border-gray-200 rounded-lg px-2 py-1 w-20 focus:outline-none focus:ring-2 focus:ring-brand-200" />
                <span className="text-xs text-gray-400">cm</span>
              </div>
            ) : (
              <span className="text-sm text-gray-800 text-right truncate">{draft.height} cm</span>
            )}
          </li>
          <li className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-xs text-gray-400 flex-shrink-0">Weight</span>
            {editing ? (
              <div className="flex items-center gap-1">
                <input value={draft.weight} onChange={(e) => setDraft((d) => ({ ...d, weight: e.target.value }))}
                  type="number" className="text-sm text-gray-800 text-right border border-gray-200 rounded-lg px-2 py-1 w-20 focus:outline-none focus:ring-2 focus:ring-brand-200" />
                <span className="text-xs text-gray-400">kg</span>
              </div>
            ) : (
              <span className="text-sm text-gray-800 text-right truncate">{draft.weight} kg</span>
            )}
          </li>
          {/* Home Show & Role — read-only, edited from list */}
          {readOnlyFields.slice(1).map(({ label, value }) => (
            <li key={label} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-xs text-gray-400 flex-shrink-0">{label}</span>
              <span className="text-sm text-gray-500 text-right truncate">{value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Actor Detail Drawer ────────────────────────────────────────────────────

function ActorDetailDrawer({
  actor, roleLabel, section, onClose, onOpenSection,
}: {
  actor: Actor;
  roleLabel: string;
  section?: "basic" | null;
  onClose: () => void;
  onOpenSection: (s: "basic" | null) => void;
}) {
  const headshotInputRef = useRef<HTMLInputElement>(null);
  const [headshotUrl, setHeadshotUrl] = useState(actor.photoUrl);
  const { statusOf, setStatusFor } = useActorStatus();
  const currentStatus = statusOf(actor);
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<{ top: number; left: number } | null>(null);

  const [collapsed, setCollapsed] = useState({
    skills: false, attachment: false, showRole: false, event: false,
  });
  const toggle = (s: keyof typeof collapsed) => setCollapsed((p) => ({ ...p, [s]: !p[s] }));
  const [offboardOpen, setOffboardOpen] = useState(false);

  // ── Basic Info inline editing (desktop) ──────────────────────────────────
  const [editingBasicInfo, setEditingBasicInfo] = useState(false);
  const [basicDraft, setBasicDraft] = useState({
    name: actor.name,
    gender: actor.gender,
    nationality: actor.nationality,
    height: String(actor.height),
    weight: String(actor.weight),
  });

  function saveBasicInfo() {
    // commit draft (demo: just close edit mode)
    setEditingBasicInfo(false);
  }

  function cancelBasicInfo() {
    setBasicDraft({ name: actor.name, gender: actor.gender, nationality: actor.nationality, height: String(actor.height), weight: String(actor.weight) });
    setEditingBasicInfo(false);
  }

  const [confirm, setConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const askConfirm = (title: string, message: string, onConfirm: () => void) =>
    setConfirm({ title, message, onConfirm });

  // ── Skill section ──────────────────────────────────────────────────────
  const [skillEntries, setSkillEntries] = useState<SkillEntry[]>(actor.skillEntries ?? []);
  const [addingSkill, setAddingSkill] = useState(false);
  const [skillDrafts, setSkillDrafts] = useState<SkillEntry[]>([]);
  const [skillForm, setSkillForm] = useState({ type: "", skill: "" });
  const skillsForType = SKILLSET_CATEGORIES.find((c) => c.type === skillForm.type)?.skills ?? [];

  function appendSkillDraft() {
    if (!skillForm.type || !skillForm.skill) return;
    const dup = [...skillEntries, ...skillDrafts].some(
      (e) => e.type === skillForm.type && e.skill === skillForm.skill);
    if (dup) { setSkillForm({ type: "", skill: "" }); return; }
    setSkillDrafts((p) => [...p, { id: `sk-${Date.now()}-${p.length}`, type: skillForm.type, skill: skillForm.skill }]);
    setSkillForm({ type: "", skill: "" });
  }

  function saveSkill() {
    // commit pending draft (if any) plus all drafts
    const pending: SkillEntry[] = [];
    if (skillForm.type && skillForm.skill
        && ![...skillEntries, ...skillDrafts].some((e) => e.type === skillForm.type && e.skill === skillForm.skill)) {
      pending.push({ id: `sk-${Date.now()}-final`, type: skillForm.type, skill: skillForm.skill });
    }
    const all = [...skillDrafts, ...pending];
    if (all.length === 0) {
      setAddingSkill(false);
      return;
    }
    setSkillEntries((p) => [...p, ...all]);
    setSkillDrafts([]);
    setSkillForm({ type: "", skill: "" });
    setAddingSkill(false);
  }

  function cancelSkill() {
    setSkillDrafts([]);
    setSkillForm({ type: "", skill: "" });
    setAddingSkill(false);
  }

  // ── Attachment section (0522 spec: merged Portfolio + Attachment → photo gallery) ──
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>(actor.mediaFiles ?? []);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [addingMedia, setAddingMedia] = useState(false);
  const [mediaForm, setMediaForm] = useState<{ note: string; file: File | null; url: string; type: "photo" | "video" }>({
    note: "", file: null, url: "", type: "photo",
  });
  const portfolioInputRef = useRef<HTMLInputElement>(null);

  function handlePortfolioPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    // Desktop inline-add flow stages a single file in the preview form.
    if (addingMedia) {
      const f = files[0];
      const url = URL.createObjectURL(f);
      const type: "photo" | "video" = f.type.startsWith("video") ? "video" : "photo";
      setMediaForm((p) => ({ ...p, file: f, url, type }));
    } else {
      // Mobile "+" tile and desktop bulk pick: append all selected files immediately.
      const next: MediaFile[] = Array.from(files).map((f) => ({
        type: (f.type.startsWith("video") ? "video" : "photo") as "photo" | "video",
        url: URL.createObjectURL(f),
        note: "",
      }));
      setMediaFiles((p) => [...p, ...next]);
    }
    e.target.value = "";
  }

  function saveMedia() {
    if (!mediaForm.url) {
      setAddingMedia(false);
      return;
    }
    setMediaFiles((p) => [...p, { type: mediaForm.type, url: mediaForm.url, note: mediaForm.note }]);
    setMediaForm({ note: "", file: null, url: "", type: "photo" });
    setAddingMedia(false);
  }

  // ── Show & Role section ────────────────────────────────────────────────
  // Per 0522 spec, the actor-side "Add show & role" entry is removed —
  // assignments are now imported in bulk or driven from the show/role page.
  // This section is read-only here (remove still allowed).
  const initialShowRoleRecords: ShowRoleRecord[] = actor.showRoleRecords
    ?? (actor.homeShow && actor.homeRole
      ? [{ id: `sr-${actor.id}-home`, show: actor.homeShow, role: actor.homeRole, roleType: "home", date: "—", status: "active" }]
      : []);
  const [showRoleRecords, setShowRoleRecords] = useState<ShowRoleRecord[]>(initialShowRoleRecords);

  // ── Event Experience section ───────────────────────────────────────────
  // Per 0522 spec, add flow is now Excel import; keep removal here.
  const [eventRecords, setEventRecords] = useState<EventRecord[]>(actor.eventRecords ?? []);

  const [addingShowRole, setAddingShowRole] = useState(false);
  const [showRoleForm, setShowRoleForm] = useState({ show: "", role: "", roleType: "home" as "home" | "swing" });
  const showRoleFormRoles = ALL_SHOWS.find((s) => s.name === showRoleForm.show)?.roles ?? [];

  function saveShowRole() {
    if (!showRoleForm.show || !showRoleForm.role) { setAddingShowRole(false); return; }
    setShowRoleRecords((p) => [...p, {
      id: `sr-${Date.now()}`, show: showRoleForm.show, role: showRoleForm.role,
      roleType: showRoleForm.roleType, date: new Date().toISOString().split("T")[0], status: "active",
    }]);
    setShowRoleForm({ show: "", role: "", roleType: "home" });
    setAddingShowRole(false);
  }

  function cancelShowRole() {
    setShowRoleForm({ show: "", role: "", roleType: "home" });
    setAddingShowRole(false);
  }

  const [addingEvent, setAddingEvent] = useState(false);
  const [eventForm, setEventForm] = useState({ eventName: "", roleName: "" });
  const eventFormRoles = rolesForEvent(eventForm.eventName);

  function saveEvent() {
    if (!eventForm.eventName || !eventForm.roleName) { setAddingEvent(false); return; }
    setEventRecords((p) => [...p, {
      id: `ev-${Date.now()}`, eventName: eventForm.eventName, roleName: eventForm.roleName,
      startDate: "", endDate: "", status: "active",
    }]);
    setEventForm({ eventName: "", roleName: "" });
    setAddingEvent(false);
  }

  function cancelEvent() {
    setEventForm({ eventName: "", roleName: "" });
    setAddingEvent(false);
  }

  const inputCls = "w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300";
  const labelCls = "block text-xs text-gray-400 mb-1";

  const activeShowRoleCount = showRoleRecords.filter((r) => r.status === "active").length;
  const activeEventCount = eventRecords.filter((r) => r.status === "active").length;

  return (
    <>
      {lightboxIdx !== null && (
        <Lightbox files={mediaFiles} initialIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          onCancel={() => setConfirm(null)}
          onConfirm={() => { confirm.onConfirm(); setConfirm(null); }}
        />
      )}
      {offboardOpen && (
        <OffboardingDialog count={1}
          onClose={() => setOffboardOpen(false)}
          onConfirm={() => setStatusFor([actor.id], "Inactive")} />
      )}
      <input ref={headshotInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setHeadshotUrl(URL.createObjectURL(f));
          e.target.value = "";
        }} />
      {statusMenuAnchor && (
        <MarkStatusMenu anchor={statusMenuAnchor} current={currentStatus}
          onClose={() => setStatusMenuAnchor(null)}
          onPick={(s) => {
            if (s === "Inactive" && currentStatus !== "Inactive") {
              setOffboardOpen(true);
            } else {
              setStatusFor([actor.id], s);
            }
          }} />
      )}
      {section === "basic" && (
        <BasicInfoMobile actor={actor} headshotUrl={headshotUrl} onBack={() => onOpenSection(null)} />
      )}
      <div className="hidden md:block fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className={`fixed inset-0 md:inset-y-0 md:right-0 md:left-auto z-50 md:w-full md:max-w-[528px] bg-white md:shadow-2xl flex flex-col ${section === "basic" ? "hidden md:flex" : ""}`}>

        {/* Mobile titlebar (full-screen mode) */}
        <div className="md:hidden flex-shrink-0 h-12 flex items-center px-2 border-b border-gray-100 bg-white">
          <button onClick={onClose} aria-label="Back"
            className="p-2 -ml-1 rounded-md text-gray-600 hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="ml-1 text-sm font-semibold text-gray-900 truncate">Casting Book</span>
        </div>

        {/* Mobile: compact card header per 0518 spec (photo + name/role/h/w/skills) */}
        <div className="md:hidden flex-shrink-0 px-4 py-3 bg-white border-b border-gray-100">
          <div className="flex gap-3">
            <div className="relative w-24 h-32 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
              <img src={headshotUrl} alt={actor.name} className="w-full h-full object-cover object-top" />
              <button
                type="button"
                onClick={() => headshotInputRef.current?.click()}
                aria-label="Replace photo"
                className="absolute bottom-1 right-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-white"
              >
                <Camera className="w-3 h-3" />
              </button>
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <button
                type="button"
                onClick={() => onOpenSection("basic")}
                className="flex items-center gap-1 w-full text-left"
              >
                <span className="text-base font-bold text-gray-900 truncate flex-1 min-w-0">{actor.name}</span>
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </button>
              <p className="text-xs text-gray-600 truncate">
                {(actor.homeShow ?? "—")} <span className="text-gray-300 mx-0.5">&amp;</span> {(actor.homeRole ?? "—")}
              </p>
              <p className="text-xs text-gray-500">
                {actor.height} cm / {actor.weight} kg
              </p>
              <button type="button" aria-label="Change status"
                onClick={() => setStatusMenuAnchor({ top: 0, left: 0 })}
                className="inline-flex self-start mt-0.5">
                <StatusBadge status={currentStatus} />
              </button>
              <div className="flex flex-wrap items-center gap-1 mt-0.5">
                {skillEntries.map((e) => (
                  <span
                    key={e.id}
                    className={`inline-flex items-center gap-0.5 pl-1.5 pr-1 py-0.5 text-[10px] rounded-full font-medium ${SKILL_TAG_COLORS[e.type] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    <span>{e.skill}</span>
                    <button
                      type="button"
                      onClick={() => askConfirm("Remove skill", `Remove "${e.skill}" from this performer?`,
                        () => setSkillEntries((p) => p.filter((x) => x.id !== e.id)))}
                      aria-label={`Remove ${e.skill}`}
                      className="hover:opacity-70"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => setAddingSkill(true)}
                  aria-label="Add skill"
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-500"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop photo header with headshot replacement */}
        <div className="hidden md:block relative flex-shrink-0 h-40 sm:h-48 bg-gray-100 group/headshot">
          <img src={headshotUrl} alt={actor.name} className="w-full h-full object-cover object-top" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <button onClick={onClose}
            className="hidden md:flex absolute top-4 right-4 w-8 h-8 bg-black/40 hover:bg-black/60 rounded-full items-center justify-center text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
          {/* Replace headshot button (mobile shows it always, desktop on hover) */}
          <button onClick={() => headshotInputRef.current?.click()}
            className="md:hidden absolute top-4 left-4 w-8 h-8 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition-colors">
            <Camera className="w-4 h-4" />
          </button>
          <button onClick={() => headshotInputRef.current?.click()}
            className="hidden md:flex absolute top-4 right-14 w-8 h-8 bg-black/40 hover:bg-black/60 rounded-full items-center justify-center text-white transition-colors opacity-0 group-hover/headshot:opacity-100">
            <Camera className="w-4 h-4" />
          </button>
          <div className="absolute bottom-4 left-5 right-5">
            <p className="text-xs text-gray-300 mb-0.5">{roleLabel}</p>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onOpenSection("basic")}
                className="md:pointer-events-none md:cursor-default flex items-center gap-1 flex-1 min-w-0 text-left"
              >
                <span className="text-xl font-bold text-white leading-tight truncate flex-1 min-w-0">{actor.name}</span>
                <ChevronRight className="md:hidden w-5 h-5 text-white/80 flex-shrink-0" />
              </button>
              <button type="button" aria-label="Change status"
                onClick={(e) => {
                  const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                  setStatusMenuAnchor({ top: r.bottom + 6, left: Math.max(8, r.right - 176) });
                }}
                className="hidden md:inline-flex flex-shrink-0">
                <StatusBadge status={currentStatus} />
              </button>
            </div>
          </div>
        </div>

        {/* Home Show & Role — removed duplicate accent strip per 0525 spec (kept in Basic Info only) */}

        {/* Basic Info — single row (desktop only). Per 0525 spec all fields editable
            except SSO (read-only) and Home Show/Role (edited in list). */}
        <div className="hidden md:block flex-shrink-0 border-b border-gray-100">
          <div className="flex items-center justify-between px-4 py-1.5 bg-gray-50/60">
            <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Basic Info</span>
            {editingBasicInfo ? (
              <div className="flex items-center gap-1.5">
                <button onClick={cancelBasicInfo} className="text-[10px] text-gray-500 hover:text-gray-700 px-2 py-0.5 border border-gray-200 rounded">Cancel</button>
                <button onClick={saveBasicInfo} className="text-[10px] text-white bg-brand-500 hover:bg-brand-600 px-2 py-0.5 rounded font-medium">Save</button>
              </div>
            ) : (
              <button onClick={() => setEditingBasicInfo(true)} className="text-[10px] text-brand-500 hover:text-brand-700 flex items-center gap-0.5 font-medium">
                <Pencil className="w-2.5 h-2.5" />Edit
              </button>
            )}
          </div>
          <div className="grid grid-cols-5">
            {/* SSO — always read-only */}
            <div className="px-2 py-2.5 text-center border-r border-gray-100">
              <p className="text-[10px] text-gray-400 mb-0.5">SSO</p>
              <p className="text-[11px] font-semibold text-gray-800 leading-snug truncate font-mono">{actor.ssoId}</p>
            </div>
            {/* Gender */}
            <div className="px-2 py-2.5 text-center border-r border-gray-100">
              <p className="text-[10px] text-gray-400 mb-0.5">Gender</p>
              {editingBasicInfo ? (
                <select value={basicDraft.gender} onChange={(e) => setBasicDraft((d) => ({ ...d, gender: e.target.value }))}
                  className="text-[11px] font-semibold text-gray-800 bg-white border border-gray-200 rounded px-1 py-0.5 w-full focus:outline-none focus:ring-1 focus:ring-brand-200">
                  <option value="men">Male</option>
                  <option value="women">Female</option>
                </select>
              ) : (
                <p className="text-[11px] font-semibold text-gray-800 leading-snug truncate">{basicDraft.gender === "men" ? "Male" : basicDraft.gender === "women" ? "Female" : "—"}</p>
              )}
            </div>
            {/* Nationality */}
            <div className="px-2 py-2.5 text-center border-r border-gray-100">
              <p className="text-[10px] text-gray-400 mb-0.5">Nationality</p>
              {editingBasicInfo ? (
                <input value={basicDraft.nationality} onChange={(e) => setBasicDraft((d) => ({ ...d, nationality: e.target.value }))}
                  className="text-[11px] font-semibold text-gray-800 bg-white border border-gray-200 rounded px-1 py-0.5 w-full text-center focus:outline-none focus:ring-1 focus:ring-brand-200" />
              ) : (
                <p className="text-[11px] font-semibold text-gray-800 leading-snug truncate">{`${actor.flag} ${basicDraft.nationality}`}</p>
              )}
            </div>
            {/* Height */}
            <div className="px-2 py-2.5 text-center border-r border-gray-100">
              <p className="text-[10px] text-gray-400 mb-0.5">Height</p>
              {editingBasicInfo ? (
                <div className="flex items-center justify-center gap-0.5">
                  <input value={basicDraft.height} onChange={(e) => setBasicDraft((d) => ({ ...d, height: e.target.value }))}
                    type="number" className="text-[11px] font-semibold text-gray-800 bg-white border border-gray-200 rounded px-1 py-0.5 w-12 text-center focus:outline-none focus:ring-1 focus:ring-brand-200" />
                  <span className="text-[10px] text-gray-400">cm</span>
                </div>
              ) : (
                <p className="text-[11px] font-semibold text-gray-800 leading-snug truncate">{basicDraft.height} cm</p>
              )}
            </div>
            {/* Weight */}
            <div className="px-2 py-2.5 text-center">
              <p className="text-[10px] text-gray-400 mb-0.5">Weight</p>
              {editingBasicInfo ? (
                <div className="flex items-center justify-center gap-0.5">
                  <input value={basicDraft.weight} onChange={(e) => setBasicDraft((d) => ({ ...d, weight: e.target.value }))}
                    type="number" className="text-[11px] font-semibold text-gray-800 bg-white border border-gray-200 rounded px-1 py-0.5 w-12 text-center focus:outline-none focus:ring-1 focus:ring-brand-200" />
                  <span className="text-[10px] text-gray-400">kg</span>
                </div>
              ) : (
                <p className="text-[11px] font-semibold text-gray-800 leading-snug truncate">{basicDraft.weight} kg</p>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable sections */}
        <div className="flex-1 overflow-y-auto flex flex-col">

          {/* ── Skillset ── */}
          <div className="md:border-b md:border-gray-100" style={{ order: 1 }}>
            <div className="hidden md:block">
              <SectionHeader
                title="Skillset" count={skillEntries.length}
                editing={addingSkill} collapsed={collapsed.skills}
                onToggleCollapse={() => toggle("skills")}
                onAdd={() => setAddingSkill(true)} addLabel="Add"
                onCancel={cancelSkill}
                onSave={saveSkill}
              />
            </div>
            {/* Mobile bottom sheet for adding a skill — triggered by the + in the card header */}
            <div className="md:hidden">
              <BottomSheet
                open={addingSkill}
                onClose={cancelSkill}
                title="Add Skillset"
                footer={
                  <div className="flex gap-2">
                    <button onClick={cancelSkill}
                      className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">Cancel</button>
                    <button onClick={saveSkill}
                      className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium">Save</button>
                  </div>
                }
              >
                {skillDrafts.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {skillDrafts.map((d) => (
                      <span key={d.id}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full font-medium ${SKILL_TAG_COLORS[d.type] ?? "bg-gray-100 text-gray-600"}`}>
                        <span>{d.skill}</span>
                        <button onClick={() => setSkillDrafts((p) => p.filter((x) => x.id !== d.id))}
                          className="ml-0.5 hover:opacity-70 transition-opacity">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>Skill Type</label>
                    <select value={skillForm.type}
                      onChange={(e) => setSkillForm({ type: e.target.value, skill: "" })}
                      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white">
                      <option value="">Select type</option>
                      {SKILLSET_CATEGORIES.map((c) => <option key={c.type} value={c.type}>{c.type}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Skill</label>
                    <select value={skillForm.skill}
                      onChange={(e) => setSkillForm((f) => ({ ...f, skill: e.target.value }))}
                      disabled={!skillForm.type}
                      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white disabled:opacity-50">
                      <option value="">Select skill</option>
                      {skillsForType.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <button onClick={appendSkillDraft}
                    disabled={!skillForm.type || !skillForm.skill}
                    className="w-full h-10 bg-brand-50 hover:bg-brand-100 disabled:opacity-40 text-brand-700 rounded-lg text-sm font-medium flex items-center justify-center gap-1">
                    <Plus className="w-4 h-4" />Add another
                  </button>
                </div>
              </BottomSheet>
            </div>
            {!collapsed.skills && (
              <div className="hidden md:block px-5 pb-4">
                {/* Add form — desktop inline (mobile uses BottomSheet above) */}
                {addingSkill && (
                  <div className="hidden md:block mb-3 p-3 bg-brand-50 rounded-xl border border-brand-100 space-y-2">
                    {/* Pending drafts list */}
                    {skillDrafts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {skillDrafts.map((d) => (
                          <span key={d.id}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full font-medium ${SKILL_TAG_COLORS[d.type] ?? "bg-gray-100 text-gray-600"}`}>
                            <span>{d.skill}</span>
                            <button onClick={() => setSkillDrafts((p) => p.filter((x) => x.id !== d.id))}
                              className="ml-0.5 hover:opacity-70 transition-opacity">
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                      <div>
                        <label className={labelCls}>Skill Type</label>
                        <select value={skillForm.type} onChange={(e) => setSkillForm({ type: e.target.value, skill: "" })}
                          className={inputCls + " bg-white"}>
                          <option value="">Select type</option>
                          {SKILLSET_CATEGORIES.map((c) => <option key={c.type} value={c.type}>{c.type}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Skill</label>
                        <select value={skillForm.skill} onChange={(e) => setSkillForm((f) => ({ ...f, skill: e.target.value }))}
                          disabled={!skillForm.type}
                          className={inputCls + " bg-white disabled:opacity-50"}>
                          <option value="">Select skill</option>
                          {skillsForType.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <button onClick={appendSkillDraft}
                        disabled={!skillForm.type || !skillForm.skill}
                        className="h-[30px] px-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1">
                        <Plus className="w-3 h-3" />Add Row
                      </button>
                    </div>
                  </div>
                )}
                {/* Skill tags (view mode shows skill only) */}
                {skillEntries.length === 0 && !addingSkill ? (
                  <p className="text-xs text-gray-300 py-2">No skills added</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {skillEntries.map((e) => (
                      <span key={e.id}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full font-medium ${SKILL_TAG_COLORS[e.type] ?? "bg-gray-100 text-gray-600"}`}>
                        <span>{e.skill}</span>
                        <button onClick={() => askConfirm("Remove skill", `Remove "${e.skill}" from this performer?`,
                          () => setSkillEntries((p) => p.filter((x) => x.id !== e.id)))}
                          className="ml-0.5 hover:opacity-70 transition-opacity">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Attachment ── */}
          <div className="border-b border-gray-100" style={{ order: 4 }}>
            <input ref={portfolioInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePortfolioPick} />
            <SectionHeader
              title="Attachment" count={mediaFiles.length}
              editing={addingMedia} collapsed={collapsed.attachment}
              onToggleCollapse={() => toggle("attachment")}
              onAdd={() => setAddingMedia(true)} addLabel="Add"
              onCancel={() => { setAddingMedia(false); setMediaForm({ note: "", file: null, url: "", type: "photo" }); }}
              onSave={saveMedia}
            />
            {!collapsed.attachment && (
              <div className="px-5 pb-4">
                {/* Add form */}
                {addingMedia && (
                  <div className="mb-3 p-3 bg-brand-50 rounded-xl border border-brand-100 space-y-2">
                    {mediaForm.url ? (
                      <div className="relative rounded-xl overflow-hidden bg-white aspect-[3/4] max-h-72">
                        <img src={mediaForm.url} alt="" className="w-full h-full object-contain" />
                        <button onClick={() => setMediaForm((p) => ({ ...p, file: null, url: "", type: "photo" }))}
                          className="absolute top-2 right-2 w-6 h-6 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div onClick={() => portfolioInputRef.current?.click()}
                        className="rounded-xl border-2 border-dashed border-brand-200 h-20 flex flex-col items-center justify-center gap-1 text-brand-300 hover:text-brand-400 cursor-pointer transition-colors">
                        <Upload className="w-4 h-4" />
                        <span className="text-xs">Click to select photo(s)</span>
                      </div>
                    )}
                    <div>
                      <label className={labelCls}>Note (optional)</label>
                      <input value={mediaForm.note} onChange={(e) => setMediaForm((p) => ({ ...p, note: e.target.value }))}
                        className={inputCls} placeholder="e.g. Front pose, stage lighting" />
                    </div>
                  </div>
                )}
                {/* Desktop grid */}
                {mediaFiles.length === 0 && !addingMedia ? (
                  <p className="hidden md:block text-xs text-gray-300 py-3 text-center">No photos</p>
                ) : (
                  <div className="hidden md:grid grid-cols-3 gap-2">
                    {mediaFiles.map((f, i) => (
                      <div key={i} className="group/media">
                        <div className="relative rounded-xl overflow-hidden bg-gray-100 aspect-[3/4]">
                          <img src={f.url} alt="" className="w-full h-full object-cover object-top" loading="lazy" />
                          {f.type === "video" && (
                            <>
                              <div className="absolute inset-0 bg-black/35" />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Play className="w-5 h-5 text-white fill-white" />
                              </div>
                              {f.duration && <span className="absolute bottom-1.5 left-1.5 text-xs text-white bg-black/60 px-1 py-0.5 rounded leading-none">{f.duration}</span>}
                            </>
                          )}
                          <button onClick={() => setLightboxIdx(i)}
                            className="absolute inset-0 opacity-0 group-hover/media:opacity-100 bg-black/20 transition-opacity flex items-center justify-center">
                            <Eye className="w-5 h-5 text-white drop-shadow" />
                          </button>
                          <button onClick={() => askConfirm("Remove photo", "This photo will be removed from the attachment gallery. Continue?",
                            () => setMediaFiles((p) => p.filter((_, idx) => idx !== i)))}
                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors opacity-0 group-hover/media:opacity-100">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        {f.note && (
                          <p className="mt-1 text-[10px] text-gray-400 leading-tight line-clamp-2 cursor-default" title={f.note}>
                            {f.note}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {/* Mobile: single-row horizontal scroller */}
                <div className="md:hidden -mx-5 px-5 flex gap-2 overflow-x-auto snap-x snap-mandatory pb-1">
                  {mediaFiles.map((f, i) => (
                    <div key={i} className="relative w-28 h-36 flex-shrink-0 snap-start rounded-xl overflow-hidden bg-gray-100">
                      <img src={f.url} alt="" className="w-full h-full object-cover object-top"
                        onClick={() => setLightboxIdx(i)} loading="lazy" />
                      {f.type === "video" && (
                        <>
                          <div className="absolute inset-0 bg-black/30 pointer-events-none" />
                          <Play className="absolute inset-0 m-auto w-5 h-5 text-white fill-white pointer-events-none" />
                        </>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          askConfirm("Remove photo", "This photo will be removed from the attachment gallery. Continue?",
                            () => setMediaFiles((p) => p.filter((_, idx) => idx !== i)));
                        }}
                        aria-label="Remove media"
                        className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {/* Trailing "+" tile */}
                  <button
                    type="button"
                    onClick={() => portfolioInputRef.current?.click()}
                    aria-label="Add media"
                    className="w-28 h-36 flex-shrink-0 snap-start rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 text-gray-300"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-[11px]">Add</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Show & Role ── */}
          <div className="border-b border-gray-100" style={{ order: 2 }}>
            <SectionHeader
              title="Show & Role" count={activeShowRoleCount}
              editing={addingShowRole} collapsed={collapsed.showRole}
              onToggleCollapse={() => toggle("showRole")}
              onAdd={() => setAddingShowRole(true)} addLabel="Add"
              onCancel={cancelShowRole}
              onSave={saveShowRole}
            />
            {!collapsed.showRole && (
              <div className="px-5 pb-4 space-y-2">
                {addingShowRole && (
                  <div className="p-3 bg-brand-50 rounded-xl border border-brand-100 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className={labelCls}>Show</label>
                        <select value={showRoleForm.show}
                          onChange={(e) => setShowRoleForm((f) => ({ ...f, show: e.target.value, role: "" }))}
                          className={inputCls + " bg-white"}>
                          <option value="">Select show</option>
                          {ALL_SHOWS.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Role</label>
                        <select value={showRoleForm.role}
                          onChange={(e) => setShowRoleForm((f) => ({ ...f, role: e.target.value }))}
                          disabled={!showRoleForm.show}
                          className={inputCls + " bg-white disabled:opacity-50"}>
                          <option value="">Select role</option>
                          {showRoleFormRoles.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Type</label>
                        <select value={showRoleForm.roleType}
                          onChange={(e) => setShowRoleForm((f) => ({ ...f, roleType: e.target.value as "home" | "swing" }))}
                          className={inputCls + " bg-white"}>
                          <option value="home">Home</option>
                          <option value="swing">Swing</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
                {showRoleRecords.length === 0 && !addingShowRole ? (
                  <p className="text-xs text-gray-300 py-3 text-center">No show assignments</p>
                ) : null}
                {[...showRoleRecords]
                  .sort((a, b) => {
                    if (a.roleType === "home" && b.roleType !== "home") return -1;
                    if (b.roleType === "home" && a.roleType !== "home") return 1;
                    return b.date.localeCompare(a.date);
                  })
                  .map((rec) => {
                    const inactive = rec.status === "inactive";
                    const tone = inactive
                      ? "border-gray-100 bg-gray-50/40 opacity-50"
                      : rec.roleType === "home"
                        ? "border-brand-100 bg-brand-50/30"
                        : "border-amber-100/70 bg-amber-50/20";
                    const chip = rec.roleType === "home"
                      ? "bg-brand-100 text-brand-700"
                      : "bg-amber-100 text-amber-700";
                    return (
                      <div key={rec.id} className={`p-3 rounded-xl border transition-opacity ${tone}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-wrap">
                            <span className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${chip}`}>
                              {rec.roleType === "home" ? "Home" : "Swing"}
                            </span>
                            <span className="text-xs font-semibold text-gray-900 truncate">{rec.show}</span>
                            <span className="text-xs text-gray-300">/</span>
                            <span className="text-xs font-medium text-gray-700 truncate">{rec.role}</span>
                          </div>
                          {inactive ? (
                            <span className="text-xs text-gray-300 flex-shrink-0">Inactive</span>
                          ) : (
                            <button onClick={() => askConfirm("Set inactive", `Set ${rec.show} / ${rec.role} as inactive?`,
                              () => setShowRoleRecords((p) => p.map((r) => r.id === rec.id ? { ...r, status: "inactive" } : r)))}
                              className="text-xs text-red-400 hover:text-red-600 transition-colors flex-shrink-0">Set inactive</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* ── Event Experience ── */}
          <div className="border-b border-gray-100" style={{ order: 3 }}>
            <SectionHeader
              title="Event Experience" count={activeEventCount}
              editing={addingEvent} collapsed={collapsed.event}
              onToggleCollapse={() => toggle("event")}
              onAdd={() => setAddingEvent(true)} addLabel="Add"
              onCancel={cancelEvent}
              onSave={saveEvent}
            />
            {!collapsed.event && (
              <div className="px-5 pb-4 space-y-2">
                {addingEvent && (
                  <div className="p-3 bg-brand-50 rounded-xl border border-brand-100 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className={labelCls}>Event Name</label>
                        <select value={eventForm.eventName}
                          onChange={(e) => setEventForm({ eventName: e.target.value, roleName: "" })}
                          className={inputCls + " bg-white"}>
                          <option value="">Select event</option>
                          {EVENT_NAME_LIST.map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Role Name</label>
                        <select value={eventForm.roleName}
                          onChange={(e) => setEventForm((f) => ({ ...f, roleName: e.target.value }))}
                          disabled={!eventForm.eventName}
                          className={inputCls + " bg-white disabled:opacity-50"}>
                          <option value="">Select role</option>
                          {eventFormRoles.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
                {eventRecords.length === 0 && !addingEvent ? (
                  <p className="text-xs text-gray-300 py-3 text-center">No event records</p>
                ) : null}
                {eventRecords.map((rec) => {
                  const inactive = rec.status === "inactive";
                  return (
                    <div key={rec.id} className={`p-3 rounded-xl border ${inactive ? "border-gray-100 opacity-40" : "border-gray-200"}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs font-semibold text-gray-900 truncate">{rec.eventName}</span>
                          <span className="text-xs text-gray-300 flex-shrink-0">&amp;</span>
                          <span className="text-xs font-medium text-gray-700 truncate">{rec.roleName}</span>
                        </div>
                        {inactive ? (
                          <span className="text-xs text-gray-300 flex-shrink-0">Inactive</span>
                        ) : (
                          <button onClick={() => askConfirm("Set inactive", `Set "${rec.eventName} & ${rec.roleName}" as inactive?`,
                            () => setEventRecords((p) => p.map((r) => r.id === rec.id ? { ...r, status: "inactive" } : r)))}
                            className="text-xs text-red-500 hover:text-red-700 px-1 py-0.5 rounded transition-colors flex-shrink-0">Set inactive</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer — just close (desktop only; mobile uses titlebar back button) */}
        <div className="hidden md:block border-t border-gray-100 px-5 py-4 flex-shrink-0">
          <button onClick={onClose} className="w-full py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">Close</button>
        </div>
        <div className="md:hidden flex-shrink-0" style={{ height: "env(safe-area-inset-bottom)" }} aria-hidden="true" />
      </div>
    </>
  );
}

// ── Excel Import Modal (shared) ────────────────────────────────────────────
// Used by Performer onboarding, Event Experience, Skill, Swing Show & Role.
// PC-only per the 0522 spec — mobile users still see the modal but the parent
// gates the entry point on a desktop viewport.

interface ImportColumn { key: string; required: boolean; hint?: string }

function ExcelImportModal({ title, subtitle, columns, sample, hint, fileBaseName, onClose, validateRow, onImport }: {
  title: string; subtitle: string;
  columns: ImportColumn[]; sample: string[];
  hint?: React.ReactNode;
  fileBaseName: string;
  onClose: () => void;
  validateRow?: (row: string[]) => string | null; // returns error message, or null if row is valid
  onImport?: (rows: string[][]) => void; // committed rows (excluding header)
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<string[][]>([]);

  function downloadTemplate() {
    const header = columns.map((c) => c.required ? `${c.key} *` : c.key);
    const ws = XLSX.utils.aoa_to_sheet([header, sample]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, fileBaseName);
    XLSX.writeFile(wb, `${fileBaseName}_template.xlsx`);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      const wb = XLSX.read(data, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 }) as string[][];
      setPreview(rows.slice(0, 8));
    };
    reader.readAsBinaryString(f);
    e.target.value = "";
  }

  const dataRows = preview.slice(1);
  const invalidRowIdx = new Set<number>();
  let firstError = "";
  dataRows.forEach((row, i) => {
    let err: string | null = null;
    columns.forEach((c, j) => {
      if (err) return;
      if (c.required && !String(row[j] ?? "").trim()) err = `Missing ${c.key}`;
    });
    if (!err && validateRow) err = validateRow(row);
    if (err) {
      invalidRowIdx.add(i + 1);
      if (!firstError) firstError = err;
    }
  });
  const hasInvalid = invalidRowIdx.size > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[92vw] max-w-3xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">{title}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-5 sm:px-6 py-4 sm:py-5 space-y-4 overflow-y-auto">
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
            <FileSpreadsheet className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-medium text-blue-700">Download template first</p>
              <p className="text-xs text-blue-500 mt-0.5">
                Required columns marked with <span className="text-red-500 font-semibold">*</span>.
                {hint}
              </p>
            </div>
            <button onClick={downloadTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors flex-shrink-0">
              <Download className="w-3.5 h-3.5" />Template
            </button>
          </div>

          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
          <div onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl h-24 flex flex-col items-center justify-center gap-2 text-gray-300 hover:border-brand-300 hover:text-brand-400 cursor-pointer transition-colors">
            <Upload className="w-6 h-6" />
            <span className="text-sm font-medium">{fileName || "Click to select .xlsx / .xls / .csv"}</span>
          </div>

          {preview.length > 0 && (
            <div className="overflow-auto rounded-xl border border-gray-100 max-h-72">
              <table className="w-full text-xs">
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className={i === 0
                      ? "bg-gray-50 font-semibold text-gray-700"
                      : invalidRowIdx.has(i)
                        ? "bg-red-50 text-red-700"
                        : "text-gray-600"}>
                      {row.map((cell, j) => (
                        <td key={j} className="px-3 py-2 border-b border-gray-100 whitespace-nowrap">{String(cell ?? "")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length >= 8 && <p className="text-xs text-gray-400 px-3 py-2">Showing first {preview.length - 1} rows…</p>}
            </div>
          )}

          {hasInvalid && (
            <p className="text-xs text-red-500">
              {invalidRowIdx.size} row{invalidRowIdx.size === 1 ? "" : "s"} highlighted above need fixes ({firstError}). Fix before importing.
            </p>
          )}
        </div>
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 px-5 sm:px-6 pb-5 pt-3 border-t border-gray-50 sm:border-t-0">
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={() => { onImport?.(dataRows); onClose(); }} disabled={!fileName || hasInvalid}
            className="px-5 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Import {dataRows.length > 0 ? `${dataRows.length} row${dataRows.length === 1 ? "" : "s"}` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Roster Import (onboarding) ────────────────────────────────────────────
// 0522 spec: SSO is the primary key. The system handles three scenarios at
// commit time (we describe them in the hint; the actual conflict-resolution
// dialog is mocked at parent level since this is a demo):
//  • SSO not found → create.
//  • SSO exists & Active → prompt to overwrite changed fields, keep the rest.
//  • SSO exists & Inactive → prompt to reactivate + overwrite.
const PERFORMER_IMPORT_COLUMNS: ImportColumn[] = [
  { key: "SSO", required: false },
  { key: "Full Name", required: true },
  { key: "Phone (if no SSO)", required: false },
  { key: "Nationality", required: false },
  { key: "Gender", required: false },
  { key: "Height (cm)", required: false },
  { key: "Weight (kg)", required: false },
  { key: "Home Show", required: false },
  { key: "Home Role", required: false },
];

function RosterImportModal({ onClose, onCommit }: { onClose: () => void; onCommit?: (rows: string[][]) => void }) {
  return (
    <ExcelImportModal
      title="Import Performers"
      subtitle="Onboard performers in bulk (PC only)"
      columns={PERFORMER_IMPORT_COLUMNS}
      sample={["20017233", "Arthur William Bennett", "", "UK", "Male", "178", "72", "UOP", "Dragon Dance"]}
      fileBaseName="performer_onboarding"
      hint={<>{" "}Imported data defaults to Active status. Use phone number if no SSO. Replace with official SSO after onboarding.</>}
      validateRow={(row) => {
        const sso = String(row[0] ?? "").trim();
        const phone = String(row[2] ?? "").trim();
        if (!sso && !phone) return "Either SSO or phone is required";
        if (sso && !/^\d{8}$/.test(sso)) return "SSO must be 8 digits";
        return null;
      }}
      onImport={(rows) => onCommit?.(rows)}
      onClose={onClose}
    />
  );
}

// ── Event Experience Import (per 0522 spec: SSO / event code / role code) ──
const EVENT_IMPORT_COLUMNS: ImportColumn[] = [
  { key: "SSO", required: true },
  { key: "Event Code", required: true },
  { key: "Role Code", required: true },
];

function EventImportModal({ onClose }: { onClose: () => void }) {
  return (
    <ExcelImportModal
      title="Import Event Experience"
      subtitle="Add event experience records in bulk (PC only)"
      columns={EVENT_IMPORT_COLUMNS}
      sample={["20017233", "EVT-2025-HUAPI", "ROLE-HEIBAI"]}
      fileBaseName="event_experience"
      hint={<>{" "}Add new rows for multiple entries. Duplicate records will be removed automatically.</>}
      onClose={onClose}
    />
  );
}

// ── Skill Import (per 0522 spec: SSO / skillset type / skill) ──
const SKILL_IMPORT_COLUMNS: ImportColumn[] = [
  { key: "SSO", required: true },
  { key: "Skillset Type", required: true },
  { key: "Skill", required: true },
];

function SkillImportModal({ onClose }: { onClose: () => void }) {
  return (
    <ExcelImportModal
      title="Import Skills"
      subtitle="Add performer skills in bulk (PC only)"
      columns={SKILL_IMPORT_COLUMNS}
      sample={["20017233", "舞蹈", "拉丁舞"]}
      fileBaseName="skill"
      hint={<>{" "}Add new rows for multiple entries. Duplicate records will be removed automatically.</>}
      onClose={onClose}
    />
  );
}

// ── Swing Show & Role Import (per 0522 spec: SSO / show name / role name) ──
const SWING_IMPORT_COLUMNS: ImportColumn[] = [
  { key: "SSO", required: true },
  { key: "Show Name", required: true },
  { key: "Role Name", required: true },
];

function SwingImportModal({ onClose }: { onClose: () => void }) {
  return (
    <ExcelImportModal
      title="Import Swing Show & Role"
      subtitle="Assign swing shows in bulk (PC only)"
      columns={SWING_IMPORT_COLUMNS}
      sample={["20017233", "UOP", "Dragon Dance"]}
      fileBaseName="swing_show_role"
      hint={<>{" "}Only Swing Show &amp; Role data can be imported.</>}
      onClose={onClose}
    />
  );
}

// ── Update Basic Info Import (per 0525 spec) ─────────────────────────────
const BASIC_INFO_IMPORT_COLUMNS: ImportColumn[] = [
  { key: "SSO", required: true },
  { key: "Name", required: false },
  { key: "Nationality", required: false },
  { key: "Gender", required: false },
  { key: "Height (cm)", required: false },
  { key: "Weight (kg)", required: false },
  { key: "Home Show", required: false },
  { key: "Home Role", required: false },
];

function BasicInfoImportModal({ onClose }: { onClose: () => void }) {
  return (
    <ExcelImportModal
      title="Update Basic Info"
      subtitle="Batch update performer basic info (PC only)"
      columns={BASIC_INFO_IMPORT_COLUMNS}
      sample={["20017233", "Arthur Bennett", "UK", "Male", "178", "72", "UOP", "Dragon Dance"]}
      fileBaseName="update_basic_info"
      hint={<>{" "}SSO is required. Include at least one other field to update. Fields left blank will not be overwritten.</>}
      validateRow={(row) => {
        const sso = String(row[0] ?? "").trim();
        if (!sso) return "SSO is required";
        if (!/^\d{8}$/.test(sso)) return "SSO must be 8 digits";
        // At least one other field must be present
        const hasOther = row.slice(1).some((v) => String(v ?? "").trim());
        if (!hasOther) return "At least one field besides SSO is required";
        return null;
      }}
      onClose={onClose}
    />
  );
}

// ── SSO Binding ────────────────────────────────────────────────────────────
// Per 0522 spec: performers imported without an SSO appear here with their
// placeholder phone number. The user fills in the real SSO and binds the row.
// The system lists everyone whose ssoId isn't the standard 8-digit "2…" form.
function SsoReplacementModal({ onClose }: { onClose: () => void }) {
  const [oldSso, setOldSso] = useState("");
  const [newSso, setNewSso] = useState("");
  const [replacements, setReplacements] = useState<{ name: string; oldSso: string; newSso: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Fuzzy search: match by SSO prefix or name substring
  const suggestions = useMemo(() => {
    const q = oldSso.trim().toLowerCase();
    if (!q) return [];
    return ALL_ACTORS_BY_SSO.filter((a) =>
      a.ssoId.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [oldSso]);

  const matchedActor = useMemo(() => {
    // Exact match on 8-digit SSO
    if (/^\d{8}$/.test(oldSso)) return ALL_ACTORS_BY_SSO.find((a) => a.ssoId === oldSso) ?? null;
    return null;
  }, [oldSso]);

  function selectSuggestion(actor: Actor) {
    setOldSso(actor.ssoId);
    setShowSuggestions(false);
  }

  function doReplace() {
    if (!matchedActor || !/^\d{8}$/.test(newSso) || oldSso === newSso) return;
    setReplacements((p) => [...p, { name: matchedActor.name, oldSso, newSso }]);
    setOldSso("");
    setNewSso("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[92vw] max-w-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Replace SSO</h2>
            <p className="text-xs text-gray-400 mt-0.5">Replace a performer&apos;s existing SSO with a new one.</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-5 sm:px-6 py-4 sm:py-5 space-y-4 overflow-y-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex-1 w-full sm:w-auto relative">
              <label className="block text-xs text-gray-400 mb-1">Old SSO</label>
              <input value={oldSso} onChange={(e) => { setOldSso(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search by SSO or name…" className="h-9 px-3 border border-gray-200 rounded-lg text-sm font-mono w-full focus:outline-none focus:ring-2 focus:ring-brand-200" />
              {showSuggestions && suggestions.length > 0 && !matchedActor && (
                <div className="absolute left-0 right-0 top-full mt-1 z-10 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {suggestions.map((a) => (
                    <button key={a.id} type="button" onClick={() => selectSuggestion(a)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm">
                      <span className="font-mono text-gray-500 text-xs">{a.ssoId}</span>
                      <span className="text-gray-800">{a.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {matchedActor && (
                <p className="mt-1 text-xs text-emerald-600">{matchedActor.name}</p>
              )}
              {oldSso && /^\d{8}$/.test(oldSso) && !matchedActor && (
                <p className="mt-1 text-xs text-red-500">No performer found</p>
              )}
            </div>
            <span className="hidden sm:block text-gray-300 text-lg pb-1">&rarr;</span>
            <div className="flex-1 w-full sm:w-auto">
              <label className="block text-xs text-gray-400 mb-1">New SSO</label>
              <input value={newSso} onChange={(e) => setNewSso(e.target.value)}
                placeholder="2xxxxxxx" className="h-9 px-3 border border-gray-200 rounded-lg text-sm font-mono w-full focus:outline-none focus:ring-2 focus:ring-brand-200" />
            </div>
            <button onClick={doReplace}
              disabled={!matchedActor || !/^\d{8}$/.test(newSso) || oldSso === newSso}
              className="h-9 px-4 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-40 whitespace-nowrap">
              Replace
            </button>
          </div>

          {replacements.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Completed Replacements</h3>
              <div className="overflow-auto rounded-xl border border-gray-100">
                <table className="w-full text-xs">
                  <thead className="text-[10px] uppercase text-gray-400 border-b border-gray-100 bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2">Name</th>
                      <th className="text-left px-3 py-2">Old SSO</th>
                      <th className="px-2 py-2"></th>
                      <th className="text-left px-3 py-2">New SSO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {replacements.map((r, i) => (
                      <tr key={i} className="bg-emerald-50/40">
                        <td className="px-3 py-2 text-gray-800">{r.name}</td>
                        <td className="px-3 py-2 font-mono text-gray-400 line-through">{r.oldSso}</td>
                        <td className="px-2 py-2 text-gray-300">&rarr;</td>
                        <td className="px-3 py-2 font-mono text-emerald-600 font-medium">{r.newSso}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 sm:px-6 pb-5 pt-3 border-t border-gray-50">
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Batch Photo Upload (0522 spec: filename = SSO; auto-match) ───────────────
function BatchPhotoUploadModal({ onClose }: { onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  type PhotoPick = { name: string; ssoId: string; matched: Actor | null };
  const [picks, setPicks] = useState<PhotoPick[]>([]);

  function ssoFromFilename(name: string): string {
    const base = name.replace(/\.[^.]+$/, "");
    const m = base.match(/^(\d{8})/) ?? base.match(/(\d{8})/);
    return m ? m[1] : "";
  }

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const next: PhotoPick[] = Array.from(files).map((f) => {
      const sso = ssoFromFilename(f.name);
      const match = sso ? PERFORMERS.find((p) => p.ssoId === sso) ?? null : null;
      return { name: f.name, ssoId: sso, matched: match };
    });
    setPicks((p) => [...p, ...next]);
    e.target.value = "";
  }

  const matched = picks.filter((p) => p.matched).length;
  const unmatched = picks.length - matched;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[92vw] max-w-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Batch Photo Upload</h2>
            <p className="text-xs text-gray-400 mt-0.5">Photos are matched to performers by SSO in the filename (e.g. <span className="font-mono">20017233.jpg</span>).</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-5 sm:px-6 py-4 sm:py-5 space-y-3 overflow-y-auto">
          <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={handlePick} />
          <div onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl h-24 flex flex-col items-center justify-center gap-2 text-gray-300 hover:border-brand-300 hover:text-brand-400 cursor-pointer transition-colors">
            <Upload className="w-6 h-6" />
            <span className="text-sm font-medium">{picks.length === 0 ? "Click to select photo files" : "Add more photos"}</span>
          </div>
          {picks.length > 0 && (
            <>
              <div className="flex items-center gap-3 text-xs">
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">Matched {matched}</span>
                {unmatched > 0 && <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded-full">No match {unmatched}</span>}
              </div>
              <div className="overflow-auto rounded-xl border border-gray-100 max-h-72">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-[10px] uppercase text-gray-400">
                    <tr>
                      <th className="text-left px-3 py-2">File</th>
                      <th className="text-left px-3 py-2">SSO</th>
                      <th className="text-left px-3 py-2">Matched performer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {picks.map((p, i) => (
                      <tr key={i} className={p.matched ? "" : "bg-red-50 text-red-700"}>
                        <td className="px-3 py-2 truncate max-w-[180px]" title={p.name}>{p.name}</td>
                        <td className="px-3 py-2 font-mono text-gray-500">{p.ssoId || "—"}</td>
                        <td className="px-3 py-2 text-gray-700">{p.matched ? p.matched.name : "No performer with this SSO"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 px-5 sm:px-6 pb-5 pt-3 border-t border-gray-50">
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={onClose} disabled={matched === 0}
            className="px-5 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Upload {matched > 0 ? `${matched} photo${matched === 1 ? "" : "s"}` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Assign Performers Dialog ───────────────────────────────────────────────
// 0522 spec inverts the assign direction: pick the show/role first, then
// browse and assign performers from a pool. Triggered from the show/role
// page's toolbar.
function AssignPerformersDialog({ show, role, defaultRoleType, onClose, onSubmit }: {
  show: Show; role: Role;
  defaultRoleType: "home" | "swing";
  onClose: () => void;
  onSubmit: (ids: number[], castType: "home" | "swing") => void;
}) {
  const [query, setQuery] = useState("");
  const [castType, setCastType] = useState<"home" | "swing">(defaultRoleType);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  // Pool: unassigned performers + those whose home show ≠ this show. Inactive
  // performers are filtered out since they shouldn't be re-cast.
  const pool = useMemo(() => {
    const list = PERFORMERS.filter((p) => (p.status ?? "Active") === "Active");
    if (!query) return list.slice(0, 60);
    const lq = query.toLowerCase();
    return list.filter((p) => p.name.toLowerCase().includes(lq) || p.ssoId.includes(query)).slice(0, 60);
  }, [query]);

  function togglePick(id: number) {
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  const title = `Assign Performers — ${show.name} / ${role.name}`;
  const body = (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or SSO"
          className="flex-1 h-9 px-2.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-200" />
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          {(["home", "swing"] as const).map((t) => (
            <button key={t} onClick={() => setCastType(t)}
              className={`flex-1 px-3 h-7 rounded-md text-xs font-medium ${castType === t ? (t === "home" ? "bg-brand-500 text-white" : "bg-amber-400 text-amber-900") : "text-gray-500"}`}>
              {t === "home" ? "Home Cast" : "Swing Cast"}
            </button>
          ))}
        </div>
      </div>
      <div className="border border-gray-100 rounded-xl max-h-72 overflow-auto">
        {pool.length === 0 ? (
          <p className="text-xs text-gray-300 py-6 text-center">No performers match</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {pool.map((p) => {
              const on = picked.has(p.id);
              return (
                <li key={p.id} className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${on ? "bg-brand-50/40" : "hover:bg-gray-50"}`}
                  onClick={() => togglePick(p.id)}>
                  <input type="checkbox" readOnly checked={on} className="accent-brand-500 w-3.5 h-3.5" />
                  <img src={p.photoUrl} alt="" className="w-7 h-7 rounded-full object-cover object-top" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-800 truncate">{p.name}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{p.ssoId}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 truncate">{p.homeShow ? `${p.homeShow}/${p.homeRole}` : "Unassigned"}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <p className="text-[11px] text-gray-400">Selected {picked.size} performer{picked.size === 1 ? "" : "s"}.</p>
    </div>
  );

  return (
    <>
      <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center bg-black/40 p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-[92vw] max-w-xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm sm:text-base">{title}</h2>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
          </div>
          <div className="px-5 sm:px-6 py-4 sm:py-5 overflow-y-auto">{body}</div>
          <div className="flex justify-end gap-2 px-5 sm:px-6 pb-5 pt-3 border-t border-gray-50">
            <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={() => onSubmit(Array.from(picked), castType)} disabled={picked.size === 0}
              className="px-5 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium disabled:opacity-40">
              Assign {picked.size > 0 ? `(${picked.size})` : ""}
            </button>
          </div>
        </div>
      </div>
      <div className="md:hidden">
        <BottomSheet open onClose={onClose} title={title}
          footer={
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">Cancel</button>
              <button onClick={() => onSubmit(Array.from(picked), castType)} disabled={picked.size === 0}
                className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium disabled:opacity-40">
                Assign {picked.size > 0 ? `(${picked.size})` : ""}
              </button>
            </div>
          }
        >{body}</BottomSheet>
      </div>
    </>
  );
}

// ── Batch Assign Role Dialog ───────────────────────────────────────────────

interface AssignTarget {
  ids: number[];
  defaultShow?: string;
  defaultRole?: string;
  defaultRoleType?: "home" | "swing";
}

function BatchAssignDialog({ target, onClose, onSubmit }: {
  target: AssignTarget; onClose: () => void; onSubmit: (params: {
    ids: number[]; assignToType: "regular" | "special"; show: string; role: string; castType: "home" | "swing";
  }) => void;
}) {
  const [assignToType, setAssignToType] = useState<"regular" | "special">("regular");
  const [show, setShow] = useState(target.defaultShow ?? "");
  const [role, setRole] = useState(target.defaultRole ?? "");
  const [castType, setCastType] = useState<"home" | "swing">(target.defaultRoleType ?? "home");

  const rolesForShow = ALL_SHOWS.find((s) => s.name === show)?.roles ?? [];
  const canSave = (assignToType === "special") || (!!show && !!role);

  const body = (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Assign to</label>
        <div className="flex items-center gap-5">
          {([
            ["regular", "Regular Show"],
            ["special", "Special Event"],
          ] as const).map(([val, lbl]) => (
            <label key={val} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={assignToType === val} onChange={() => setAssignToType(val)} className="accent-brand-500" />
              <span className="text-sm text-gray-700">{lbl}</span>
            </label>
          ))}
        </div>
      </div>

      {assignToType === "regular" && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Show</label>
            <select value={show} onChange={(e) => { setShow(e.target.value); setRole(""); }}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-200 text-gray-700">
              <option value="">Please Choose</option>
              {ALL_SHOWS.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} disabled={!show}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-200 text-gray-700 disabled:opacity-50">
              <option value="">Please Choose</option>
              {rolesForShow.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
            </select>
          </div>
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Cast Type</label>
        <div className="flex gap-2">
          {([
            ["home", "Home Cast"], ["swing", "Swing Cast"],
          ] as const).map(([val, lbl]) => (
            <button key={val} onClick={() => setCastType(val)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${castType === val ? "bg-brand-50 border-brand-300 text-brand-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
              {lbl}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const title = `Batch Assign for ${target.ids.length} Performer${target.ids.length === 1 ? "" : "s"}`;

  return (
    <>
      {/* Desktop centered modal */}
      <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center bg-black/40 p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-[92vw] max-w-lg max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm sm:text-base">{title}</h2>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 transition-colors"><X className="w-5 h-5" /></button>
          </div>
          <div className="px-5 sm:px-6 py-4 sm:py-5 overflow-y-auto">{body}</div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 px-5 sm:px-6 pb-5 pt-3 border-t border-gray-50 sm:border-t-0">
            <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={() => onSubmit({ ids: target.ids, assignToType, show, role, castType })} disabled={!canSave}
              className="px-5 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 disabled:opacity-40 transition-colors">Save</button>
          </div>
        </div>
      </div>
      {/* Mobile bottom sheet */}
      <div className="md:hidden">
        <BottomSheet open onClose={onClose} title={title}
          footer={
            <div className="flex gap-2">
              <button onClick={onClose}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">Cancel</button>
              <button onClick={() => onSubmit({ ids: target.ids, assignToType, show, role, castType })} disabled={!canSave}
                className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium disabled:opacity-40">Save</button>
            </div>
          }
        >
          {body}
        </BottomSheet>
      </div>
    </>
  );
}

// ── Performer Card ─────────────────────────────────────────────────────────

function PerformerCard({ actor, index, type, selected, onSelect, onOpen, onMarkStatus }: {
  actor: Actor; index: number; type: "home" | "swing";
  selected?: boolean; onSelect?: () => void; onOpen: (id: number) => void;
  onMarkStatus?: (id: number, anchor: { top: number; left: number }) => void;
}) {
  const { statusOf } = useActorStatus();
  const status = statusOf(actor);
  return (
    <>
      <div className={`group relative bg-white rounded-xl overflow-hidden border shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 ${selected ? "border-brand-400 ring-2 ring-brand-200" : "border-gray-100"}`}>
        <div className="absolute top-2 left-2 z-10">
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${type === "home" ? "bg-brand-500 text-white" : "bg-amber-400 text-amber-900"}`}>
            {type === "home" ? `H${index + 1}` : `S${index + 1}`}
          </span>
        </div>
        {onSelect && (
          <button onClick={(e) => { e.stopPropagation(); onSelect(); }}
            className={`absolute top-2 right-2 z-10 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selected ? "bg-brand-500 border-brand-500 text-white" : "border-white/70 bg-black/20 text-transparent group-hover:border-white"}`}>
            {selected && <Check className="w-3 h-3" />}
          </button>
        )}
        <div className="relative w-full cursor-pointer" style={{ paddingBottom: "133%" }} onClick={() => onOpen(actor.id)}>
          <img src={actor.photoUrl} alt={actor.name} className="absolute inset-0 w-full h-full object-cover object-top" loading="lazy" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow">
              <Eye className="w-3.5 h-3.5 text-gray-700" />
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
              onMarkStatus?.(actor.id, { top: r.bottom + 6, left: Math.max(8, r.left - 100) });
            }}
            aria-label="Change status"
            className="absolute bottom-1.5 left-1.5 z-10"
          >
            <StatusBadge status={status} />
          </button>
        </div>
        <div className="px-2 py-2">
          <p className="text-xs font-bold text-gray-900 leading-snug truncate">{actor.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-400">
            <span>{actor.flag}</span>
            <span>{actor.height}cm</span>
          </div>
          {actor.skillEntries && actor.skillEntries.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {actor.skillEntries.slice(0, 2).map((e) => (
                <span key={e.id}
                  className={`inline-flex items-center px-1.5 py-0.5 text-[10px] rounded-full font-medium leading-tight ${SKILL_TAG_COLORS[e.type] ?? "bg-gray-100 text-gray-600"}`}>
                  {e.skill}
                </span>
              ))}
              {actor.skillEntries.length > 2 && (
                <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded-full font-medium leading-tight bg-gray-100 text-gray-500">
                  +{actor.skillEntries.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Data Ops Menu ─────────────────────────────────────────────────────────

function ImportMenu({ onImportPerformers, onImportEvents, onImportSkills, onImportSwing, onUpdateBasicInfo, onBatchPhotos }: {
  onImportPerformers: () => void; onImportEvents: () => void; onImportSkills: () => void;
  onImportSwing: () => void; onUpdateBasicInfo: () => void; onBatchPhotos: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative hidden md:block">
      <button onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1.5 h-9 px-3.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors">
        <Upload className="w-3.5 h-3.5" />Import <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 bg-white border border-gray-200 rounded-xl shadow-lg w-60 py-1 text-sm">
            <button onClick={() => { setOpen(false); onImportPerformers(); }}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700">
              <Upload className="w-3.5 h-3.5 text-gray-400" />Import Performers
            </button>
            <button onClick={() => { setOpen(false); onUpdateBasicInfo(); }}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700">
              <Upload className="w-3.5 h-3.5 text-gray-400" />Update Basic Info
            </button>
            <button onClick={() => { setOpen(false); onImportEvents(); }}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700">
              <Upload className="w-3.5 h-3.5 text-gray-400" />Import Event Experience
            </button>
            <button onClick={() => { setOpen(false); onImportSkills(); }}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700">
              <Upload className="w-3.5 h-3.5 text-gray-400" />Import Skills
            </button>
            <button onClick={() => { setOpen(false); onImportSwing(); }}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700">
              <Upload className="w-3.5 h-3.5 text-gray-400" />Import Swing Show &amp; Role
            </button>
            <div className="my-1 border-t border-gray-100" />
            <button onClick={() => { setOpen(false); onBatchPhotos(); }}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700">
              <Camera className="w-3.5 h-3.5 text-gray-400" />Batch Photo Upload
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Card View ──────────────────────────────────────────────────────────────

function CardView({ selectedShow, selectedRole, castTab, setCastTab, onCast, onAssignPerformers, showUnassigned, onOpenActor,
  onImportPerformers, onImportEvents, onImportSkills, onImportSwing, onReplaceSso, onUpdateBasicInfo, onBatchPhotos,
}: {
  selectedShow: Show | null; selectedRole: Role | null;
  castTab: "home" | "swing"; setCastTab: (t: "home" | "swing") => void;
  onCast: (ids: number[]) => void;
  onAssignPerformers: () => void;
  showUnassigned: boolean;
  onOpenActor: (id: number) => void;
  onImportPerformers: () => void; onImportEvents: () => void; onImportSkills: () => void;
  onImportSwing: () => void; onReplaceSso: () => void; onUpdateBasicInfo: () => void; onBatchPhotos: () => void;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const { statusOf, setStatusFor } = useActorStatus();
  const activeFilterCount = countActiveFilters(filters);
  const [markMenu, setMarkMenu] = useState<{ ids: number[]; anchor?: { top: number; left: number }; single?: boolean } | null>(null);
  const [offboardIds, setOffboardIds] = useState<number[] | null>(null);

  function updateFilters(next: Filters) {
    setFilters(next);
    setPage(1);
  }

  function toggleSelect(id: number) {
    setSelectedIds((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  function openCardStatusMenu(id: number, anchor: { top: number; left: number }) {
    setMarkMenu({ ids: [id], anchor, single: true });
  }
  function openBatchStatusMenu(anchor?: { top: number; left: number }) {
    if (selectedIds.size === 0) return;
    setMarkMenu({ ids: Array.from(selectedIds), anchor });
  }
  function applyStatusPick(s: ActorStatus) {
    if (!markMenu) return;
    if (s === "Inactive") {
      // 0522 spec: offboarding requires a reason before flipping to Inactive.
      setOffboardIds(markMenu.ids);
      return;
    }
    setStatusFor(markMenu.ids, s);
    if (!markMenu.single) setSelectedIds(new Set());
  }

  if (showUnassigned) {
    const unassignedAll = PERFORMERS.filter((p) => !p.homeShow);
    const unassigned = unassignedAll.filter((p) => actorMatchesFilters(p, filters, statusOf));
    const totalPages = Math.max(1, Math.ceil(unassigned.length / pageSize));
    const safeP = Math.min(page, totalPages);
    const pageItems = unassigned.slice((safeP - 1) * pageSize, safeP * pageSize);
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-4 sm:pt-5 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-gray-900">Unassigned</h2>
              <p className="text-xs text-gray-400 mt-0.5">{unassignedAll.length} performers without a home show/role</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowFilter((p) => !p)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${showFilter ? "bg-brand-50 border-brand-300 text-brand-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                <Filter className="w-4 h-4" />Filter
                {activeFilterCount > 0 && <span className="text-[10px] bg-brand-500 text-white rounded-full px-1.5 py-0.5">{activeFilterCount}</span>}
              </button>
              <button onClick={onReplaceSso}
                className="hidden md:flex items-center gap-1.5 h-9 px-3.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                <Pencil className="w-3.5 h-3.5 text-gray-400" />Replace SSO
              </button>
              <ImportMenu onImportPerformers={onImportPerformers} onImportEvents={onImportEvents} onImportSkills={onImportSkills} onImportSwing={onImportSwing} onUpdateBasicInfo={onUpdateBasicInfo} onBatchPhotos={onBatchPhotos} />
            </div>
          </div>
          {showFilter && (
            <div className="hidden md:block">
              <FilterPanel filters={filters} onChange={updateFilters} onClose={() => setShowFilter(false)} />
            </div>
          )}
          <div className="md:hidden">
            <BottomSheet open={showFilter} onClose={() => setShowFilter(false)} title="筛选"
              footer={
                <div className="flex gap-2">
                  <button onClick={() => updateFilters(EMPTY_FILTERS)}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 flex items-center justify-center gap-1">
                    <RotateCcw className="w-3.5 h-3.5" />Reset
                  </button>
                  <button onClick={() => setShowFilter(false)}
                    className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium">Apply</button>
                </div>
              }
            >
              <FilterPanel filters={filters} onChange={updateFilters} onClose={() => setShowFilter(false)} />
            </BottomSheet>
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between mb-3 px-3 py-2 bg-brand-50 border border-brand-100 rounded-lg">
              <span className="text-xs text-brand-700 font-medium">已选择{selectedIds.size}项</span>
              <div className="flex items-center gap-2">
                <button onClick={(e) => {
                  const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                  openBatchStatusMenu({ top: r.bottom + 6, left: Math.max(8, r.right - 176) });
                }}
                  className="px-3.5 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors">
                  Mark Status
                </button>
                <button onClick={() => { onCast(Array.from(selectedIds)); }}
                  className="px-3.5 py-1.5 bg-brand-500 text-white rounded-lg text-xs font-medium hover:bg-brand-600 transition-colors">
                  Assign Role
                </button>
              </div>
            </div>
          )}
          {unassigned.length === 0 ? (
            <p className="text-sm text-gray-300 py-8 text-center">{unassignedAll.length === 0 ? "All performers are assigned" : "No performers match the filters"}</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {pageItems.map((a, i) => (
                <PerformerCard key={a.id} actor={a} index={i} type="home"
                  selected={selectedIds.has(a.id)} onSelect={() => toggleSelect(a.id)} onOpen={onOpenActor}
                  onMarkStatus={openCardStatusMenu} />
              ))}
            </div>
          )}
        </div>
        {totalPages > 1 && (
          <Paginator page={safeP} totalPages={totalPages} pageSize={pageSize} pageSizeOptions={[12, 24, 48]}
            totalItems={unassigned.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
        )}
        {markMenu && (() => {
          const cur = markMenu.single ? (findActorById(markMenu.ids[0]) ? statusOf(findActorById(markMenu.ids[0])!) : undefined) : undefined;
          return <MarkStatusMenu anchor={markMenu.anchor}
            current={cur}
            count={markMenu.single ? undefined : markMenu.ids.length}
            onClose={() => setMarkMenu(null)} onPick={applyStatusPick} />;
        })()}
        {offboardIds && (
          <OffboardingDialog count={offboardIds.length}
            onClose={() => { setOffboardIds(null); setMarkMenu(null); }}
            onConfirm={() => {
              setStatusFor(offboardIds, "Inactive");
              if (!markMenu?.single) setSelectedIds(new Set());
              setMarkMenu(null);
            }} />
        )}
      </div>
    );
  }

  if (!selectedShow || !selectedRole) {
    const allFiltered = ALL_ACTORS_BY_SSO.filter((p) => actorMatchesFilters(p, filters, statusOf));
    const allTotalPages = Math.max(1, Math.ceil(allFiltered.length / pageSize));
    const allSafeP = Math.min(page, allTotalPages);
    const allPageItems = allFiltered.slice((allSafeP - 1) * pageSize, allSafeP * pageSize);
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-4 sm:pt-5 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-gray-900">All Performers</h2>
              <p className="text-xs text-gray-400 mt-0.5">{allFiltered.length} performers</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowFilter((p) => !p)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${showFilter ? "bg-brand-50 border-brand-300 text-brand-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                <Filter className="w-4 h-4" />Filter
                {activeFilterCount > 0 && <span className="text-[10px] bg-brand-500 text-white rounded-full px-1.5 py-0.5">{activeFilterCount}</span>}
              </button>
              <button onClick={onReplaceSso}
                className="hidden md:flex items-center gap-1.5 h-9 px-3.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                <Pencil className="w-3.5 h-3.5 text-gray-400" />Replace SSO
              </button>
              <ImportMenu onImportPerformers={onImportPerformers} onImportEvents={onImportEvents} onImportSkills={onImportSkills} onImportSwing={onImportSwing} onUpdateBasicInfo={onUpdateBasicInfo} onBatchPhotos={onBatchPhotos} />
            </div>
          </div>
          {showFilter && (
            <div className="hidden md:block">
              <FilterPanel filters={filters} onChange={updateFilters} onClose={() => setShowFilter(false)} />
            </div>
          )}
          <div className="md:hidden">
            <BottomSheet open={showFilter} onClose={() => setShowFilter(false)} title="筛选"
              footer={
                <div className="flex gap-2">
                  <button onClick={() => updateFilters(EMPTY_FILTERS)}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 flex items-center justify-center gap-1">
                    <RotateCcw className="w-3.5 h-3.5" />Reset
                  </button>
                  <button onClick={() => setShowFilter(false)}
                    className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium">Apply</button>
                </div>
              }
            >
              <FilterPanel filters={filters} onChange={updateFilters} onClose={() => setShowFilter(false)} />
            </BottomSheet>
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between mb-3 px-3 py-2 bg-brand-50 border border-brand-100 rounded-lg">
              <span className="text-xs text-brand-700 font-medium">已选择{selectedIds.size}项</span>
              <div className="flex items-center gap-2">
                <button onClick={(e) => {
                  const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                  openBatchStatusMenu({ top: r.bottom + 6, left: Math.max(8, r.right - 176) });
                }}
                  className="px-3.5 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors">
                  Mark Status
                </button>
                <button onClick={() => { onCast(Array.from(selectedIds)); }}
                  className="px-3.5 py-1.5 bg-brand-500 text-white rounded-lg text-xs font-medium hover:bg-brand-600 transition-colors">
                  Assign Role
                </button>
              </div>
            </div>
          )}
          {allFiltered.length === 0 ? (
            <p className="text-sm text-gray-300 py-8 text-center">No performers match the filters</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {allPageItems.map((a, i) => (
                <PerformerCard key={a.id} actor={a} index={(allSafeP - 1) * pageSize + i} type="home"
                  selected={selectedIds.has(a.id)} onSelect={() => toggleSelect(a.id)} onOpen={onOpenActor}
                  onMarkStatus={openCardStatusMenu} />
              ))}
            </div>
          )}
        </div>
        {allTotalPages > 1 && (
          <Paginator page={allSafeP} totalPages={allTotalPages} pageSize={pageSize} pageSizeOptions={[12, 24, 48]}
            totalItems={allFiltered.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
        )}
        {markMenu && (() => {
          const cur = markMenu.single ? (findActorById(markMenu.ids[0]) ? statusOf(findActorById(markMenu.ids[0])!) : undefined) : undefined;
          return <MarkStatusMenu anchor={markMenu.anchor}
            current={cur}
            count={markMenu.single ? undefined : markMenu.ids.length}
            onClose={() => setMarkMenu(null)} onPick={applyStatusPick} />;
        })()}
        {offboardIds && (
          <OffboardingDialog count={offboardIds.length}
            onClose={() => { setOffboardIds(null); setMarkMenu(null); }}
            onConfirm={() => {
              setStatusFor(offboardIds, "Inactive");
              if (!markMenu?.single) setSelectedIds(new Set());
              setMarkMenu(null);
            }} />
        )}
      </div>
    );
  }

  const allActors = castTab === "home" ? selectedRole.homeActors : selectedRole.swingActors;

  const filteredActors = allActors.filter((a) => actorMatchesFilters(a, filters, statusOf));

  const allItems = filteredActors.map((a, i) => ({ type: "actor" as const, actor: a, index: i }));

  const totalItems = allItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeP = Math.min(page, totalPages);
  const pageItems = allItems.slice((safeP - 1) * pageSize, safeP * pageSize);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-4">
          {/* Breadcrumb */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="text-sm sm:text-base min-w-0">
              <span className="text-gray-500">Regular Show</span>
              <span className="text-gray-300 mx-2">/</span>
              <span className="text-gray-500">{selectedShow.name}</span>
              <span className="text-gray-300 mx-2">/</span>
              <span className="text-gray-900 font-semibold">{selectedRole.name}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setShowFilter((p) => !p)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${showFilter ? "bg-brand-50 border-brand-300 text-brand-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                <Filter className="w-4 h-4" />Filter
                {activeFilterCount > 0 && <span className="text-[10px] bg-brand-500 text-white rounded-full px-1.5 py-0.5">{activeFilterCount}</span>}
              </button>
              <button onClick={onAssignPerformers}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors shadow-sm">
                <Users className="w-4 h-4" />Assign Performers
              </button>
              <button onClick={onReplaceSso}
                className="hidden md:flex items-center gap-1.5 h-9 px-3.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                <Pencil className="w-3.5 h-3.5 text-gray-400" />Replace SSO
              </button>
              <ImportMenu onImportPerformers={onImportPerformers} onImportEvents={onImportEvents} onImportSkills={onImportSkills} onImportSwing={onImportSwing} onUpdateBasicInfo={onUpdateBasicInfo} onBatchPhotos={onBatchPhotos} />
            </div>
          </div>

          {/* Filter panel — desktop inline */}
          {showFilter && (
            <div className="hidden md:block">
              <FilterPanel filters={filters} onChange={updateFilters} onClose={() => setShowFilter(false)} />
            </div>
          )}
          {/* Filter — mobile bottom sheet */}
          <div className="md:hidden">
            <BottomSheet open={showFilter} onClose={() => setShowFilter(false)} title="筛选"
              footer={
                <div className="flex gap-2">
                  <button onClick={() => updateFilters(EMPTY_FILTERS)}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 flex items-center justify-center gap-1">
                    <RotateCcw className="w-3.5 h-3.5" />Reset
                  </button>
                  <button onClick={() => setShowFilter(false)}
                    className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium">Apply</button>
                </div>
              }
            >
              <FilterPanel filters={filters} onChange={updateFilters} onClose={() => setShowFilter(false)} />
            </BottomSheet>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between mb-3 px-3 py-2 bg-brand-50 border border-brand-100 rounded-lg">
              <span className="text-xs text-brand-700 font-medium">已选择{selectedIds.size}项</span>
              <div className="flex items-center gap-3">
                <button onClick={(e) => {
                  const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                  openBatchStatusMenu({ top: r.bottom + 6, left: Math.max(8, r.right - 176) });
                }}
                  className="px-3 py-1 bg-white border border-gray-200 text-gray-700 rounded-md text-xs font-medium hover:bg-gray-50 transition-colors">
                  Mark Status
                </button>
                <button onClick={() => setSelectedIds(new Set())} className="text-xs text-gray-500 hover:text-gray-700">Clear</button>
              </div>
            </div>
          )}

          {/* Home / Swing tabs */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl w-fit mb-5">
            {(["home", "swing"] as const).map((t) => {
              const count = t === "home" ? selectedRole.homeActors.length : selectedRole.swingActors.length;
              return (
                <button key={t} onClick={() => { setCastTab(t); setPage(1); setSelectedIds(new Set()); }}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${castTab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                  {t === "home" ? "Home Cast" : "Swing Cast"}
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${castTab === t ? (t === "home" ? "bg-brand-100 text-brand-600" : "bg-amber-100 text-amber-700") : "bg-gray-200 text-gray-500"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {totalItems === 0 ? (
            <p className="text-sm text-gray-300 py-8 text-center">No {castTab} cast assigned</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {pageItems.map((item) =>
                <PerformerCard key={item.actor.id} actor={item.actor} index={item.index} type={castTab}
                  selected={selectedIds.has(item.actor.id)}
                  onSelect={() => toggleSelect(item.actor.id)}
                  onOpen={onOpenActor}
                  onMarkStatus={openCardStatusMenu} />
              )}
            </div>
          )}
        </div>
      </div>
      {totalPages > 1 && (
        <Paginator page={safeP} totalPages={totalPages} pageSize={pageSize} pageSizeOptions={[12, 24, 48]}
          totalItems={totalItems} onPageChange={setPage} onPageSizeChange={setPageSize} />
      )}
      {markMenu && (() => {
        const cur = markMenu.single ? (findActorById(markMenu.ids[0]) ? statusOf(findActorById(markMenu.ids[0])!) : undefined) : undefined;
        return <MarkStatusMenu anchor={markMenu.anchor}
          current={cur}
          count={markMenu.single ? undefined : markMenu.ids.length}
          onClose={() => setMarkMenu(null)} onPick={applyStatusPick} />;
      })()}
      {offboardIds && (
        <OffboardingDialog count={offboardIds.length}
          onClose={() => { setOffboardIds(null); setMarkMenu(null); }}
          onConfirm={() => {
            setStatusFor(offboardIds, "Inactive");
            if (!markMenu?.single) setSelectedIds(new Set());
            setMarkMenu(null);
          }} />
      )}
    </div>
  );
}

// ── Roster View (List) ─────────────────────────────────────────────────────

type SortKey = "height" | "weight" | null;
type SortDir = "asc" | "desc";

function SortBtn({ col, sortKey, sortDir, onSort }: { col: SortKey; sortKey: SortKey; sortDir: SortDir; onSort: (k: SortKey) => void }) {
  const active = col === sortKey;
  return (
    <button onClick={() => onSort(col)} className="ml-1 inline-flex text-gray-300 hover:text-gray-600 transition-colors">
      {active ? (sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-brand-500" /> : <ArrowDown className="w-3 h-3 text-brand-500" />) : <ArrowUpDown className="w-3 h-3" />}
    </button>
  );
}

function RosterView({ onImportPerformers, onImportEvents, onImportSkills, onImportSwing, onBindSso, onUpdateBasicInfo, onBatchPhotos, selectedShow, selectedRole, showUnassigned, onOpenActor }: {
  onImportPerformers: () => void;
  onImportEvents: () => void;
  onImportSkills: () => void;
  onImportSwing: () => void;
  onBindSso: () => void;
  onUpdateBasicInfo: () => void;
  onBatchPhotos: () => void;
  selectedShow: Show | null; selectedRole: Role | null; showUnassigned: boolean;
  onOpenActor: (id: number) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const { statusOf, setStatusFor } = useActorStatus();
  const [markMenu, setMarkMenu] = useState<{ ids: number[]; anchor?: { top: number; left: number }; single?: boolean } | null>(null);
  const [offboardIds, setOffboardIds] = useState<number[] | null>(null);

  const activeFilterCount = countActiveFilters(filters);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const offboardAvailable = selectedIds.size > 0;

  function openRowStatusMenu(id: number, anchor: { top: number; left: number }) {
    setMarkMenu({ ids: [id], anchor, single: true });
  }
  function openBatchStatusMenu(anchor?: { top: number; left: number }) {
    if (selectedIds.size === 0) return;
    setMarkMenu({ ids: Array.from(selectedIds), anchor });
  }
  function applyStatusPick(s: ActorStatus) {
    if (!markMenu) return;
    if (s === "Inactive") {
      setOffboardIds(markMenu.ids);
      return;
    }
    setStatusFor(markMenu.ids, s);
    if (!markMenu.single) setSelectedIds(new Set());
  }

  function handleSort(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("asc"); }
  }

  function updateFilters(next: Filters) {
    setFilters(next);
    setPage(1);
  }

  // Roster pool follows the left-nav selection:
  // - Unassigned tab → performers with no home show
  // - A specific role selected → that role's home + swing actors (enriched so the
  //   detail drawer renders the full picture)
  // - Nothing selected → empty (don't load any actors until the user picks a role)
  const rosterPool = useMemo<Actor[]>(() => {
    if (showUnassigned) return PERFORMERS.filter((p) => !p.homeShow);
    if (selectedShow && selectedRole) {
      return [
        ...selectedRole.homeActors.map((a) => enrichActor(a, selectedShow.name, selectedRole.name)),
        ...selectedRole.swingActors.map((a) => enrichActor(a, selectedShow.name, selectedRole.name)),
      ];
    }
    return [];
  }, [showUnassigned, selectedShow, selectedRole]);

  const filtered = useMemo(() => rosterPool.filter((p) => actorMatchesFilters(p, filters, statusOf)), [rosterPool, filters, statusOf]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safeP = Math.min(page, totalPages);
  const pageRows = sorted.slice((safeP - 1) * pageSize, safeP * pageSize);

  const allSelected = pageRows.length > 0 && pageRows.every((p) => selectedIds.has(p.id));
  function toggleAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) pageRows.forEach((p) => next.delete(p.id));
      else pageRows.forEach((p) => next.add(p.id));
      return next;
    });
  }
  function toggleOne(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb + action bar */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-5 py-3 flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="text-sm sm:text-base min-w-0">
          {showUnassigned ? (
            <span className="text-gray-900 font-semibold">Unassigned</span>
          ) : (
            <>
              <span className="text-gray-500">Regular Show</span>
              {selectedShow && (<><span className="text-gray-300 mx-2">/</span><span className="text-gray-500">{selectedShow.name}</span></>)}
              {selectedRole && (<><span className="text-gray-300 mx-2">/</span><span className="text-gray-900 font-semibold">{selectedRole.name}</span></>)}
            </>
          )}
        </div>
        <button onClick={() => setShowFilter((p) => !p)}
          className={`sm:ml-3 flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium border transition-colors ${showFilter ? "bg-brand-50 border-brand-300 text-brand-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
          <Filter className="w-4 h-4" />Filter
          {activeFilterCount > 0 && <span className="text-[10px] bg-brand-500 text-white rounded-full px-1.5 py-0.5">{activeFilterCount}</span>}
        </button>
        <span className="text-xs text-gray-400">{sorted.length} performers</span>
        {offboardAvailable && (
          <>
            <span className="text-xs text-brand-700 font-medium">已选择{selectedIds.size}项</span>
            <button onClick={(e) => {
              const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
              openBatchStatusMenu({ top: r.bottom + 6, left: Math.max(8, r.right - 176) });
            }}
              className="h-9 px-3 border border-gray-200 text-gray-700 bg-white rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Mark Status
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="text-xs text-gray-500 hover:text-gray-700">Clear</button>
          </>
        )}
        {/* Replace SSO + Import menu — PC only per 0525 spec. */}
        <div className="ml-auto hidden md:flex items-center gap-2">
          <button onClick={onBindSso}
            className="h-9 flex items-center gap-1.5 px-3.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            <Pencil className="w-3.5 h-3.5 text-gray-400" />Replace SSO
          </button>
          <div className="relative">
            <button onClick={() => setActionMenuOpen((p) => !p)}
              className="h-9 flex items-center gap-1.5 px-4 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors">
              <Upload className="w-3.5 h-3.5" />Import <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {actionMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setActionMenuOpen(false)} />
                <div className="absolute right-0 top-10 z-50 bg-white border border-gray-200 rounded-xl shadow-lg w-60 py-1 text-sm">
                  <button onClick={() => { setActionMenuOpen(false); onImportPerformers(); }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700">
                    <Upload className="w-3.5 h-3.5 text-gray-400" />Import Performers
                  </button>
                  <button onClick={() => { setActionMenuOpen(false); onUpdateBasicInfo(); }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700">
                    <Upload className="w-3.5 h-3.5 text-gray-400" />Update Basic Info
                  </button>
                  <button onClick={() => { setActionMenuOpen(false); onImportEvents(); }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700">
                    <Upload className="w-3.5 h-3.5 text-gray-400" />Import Event Experience
                  </button>
                  <button onClick={() => { setActionMenuOpen(false); onImportSkills(); }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700">
                    <Upload className="w-3.5 h-3.5 text-gray-400" />Import Skills
                  </button>
                  <button onClick={() => { setActionMenuOpen(false); onImportSwing(); }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700">
                    <Upload className="w-3.5 h-3.5 text-gray-400" />Import Swing Show &amp; Role
                  </button>
                  <div className="my-1 border-t border-gray-100" />
                  <button onClick={() => { setActionMenuOpen(false); onBatchPhotos(); }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700">
                    <Camera className="w-3.5 h-3.5 text-gray-400" />Batch Photo Upload
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showFilter && (
        <div className="hidden md:block px-4 sm:px-5 pt-4 bg-gray-50">
          <FilterPanel filters={filters} onChange={updateFilters} onClose={() => setShowFilter(false)} />
        </div>
      )}
      <div className="md:hidden">
        <BottomSheet open={showFilter} onClose={() => setShowFilter(false)} title="筛选"
          footer={
            <div className="flex gap-2">
              <button onClick={() => updateFilters(EMPTY_FILTERS)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 flex items-center justify-center gap-1">
                <RotateCcw className="w-3.5 h-3.5" />Reset
              </button>
              <button onClick={() => setShowFilter(false)}
                className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium">Apply</button>
            </div>
          }
        >
          <FilterPanel filters={filters} onChange={updateFilters} onClose={() => setShowFilter(false)} />
        </BottomSheet>
      </div>

      {/* Mobile card list (<md) */}
      <div className="md:hidden flex-1 overflow-y-auto bg-gray-50 px-3 py-3 space-y-2">
        {pageRows.length === 0 && (
          <div className="text-center py-16 text-gray-300 text-sm">
            {!showUnassigned && !selectedRole ? "Select a role to view performers" : "No performers found"}
          </div>
        )}
        {pageRows.map((p) => (
          <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-3 flex items-start gap-3 active:bg-gray-50"
            onClick={() => onOpenActor(p.id)}>
            <input
              type="checkbox"
              checked={selectedIds.has(p.id)}
              onChange={(e) => { e.stopPropagation(); toggleOne(p.id); }}
              onClick={(e) => e.stopPropagation()}
              className="mt-1 w-4 h-4 rounded border-gray-300 accent-brand-500 flex-shrink-0"
            />
            <img src={p.photoUrl} alt={p.name} className="w-12 h-12 rounded-full object-cover object-top ring-1 ring-gray-100 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{p.name}</p>
                  <p className="text-[11px] text-gray-400 font-mono truncate">{p.ssoId}</p>
                </div>
                <span className="text-[11px] text-gray-500 whitespace-nowrap">{p.flag} {p.nationality}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
                <span>Height <span className="text-gray-700 font-medium">{p.height}</span></span>
                <span>Weight <span className="text-gray-700 font-medium">{p.weight}</span></span>
                <span className="truncate">
                  {p.homeShow ? <>{p.homeShow} &amp; <span className="text-gray-700 font-medium">{p.homeRole}</span></> : "—"}
                </span>
              </div>
              <div className="mt-1.5">
                <button onClick={(e) => { e.stopPropagation(); openRowStatusMenu(p.id, { top: 0, left: 0 }); }}
                  className="inline-flex">
                  <StatusBadge status={statusOf(p)} />
                </button>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onOpenActor(p.id); }}
              className="flex-shrink-0 text-xs text-brand-500 hover:text-brand-700 font-medium px-2 py-1"
            >
              View
            </button>
          </div>
        ))}
      </div>

      {/* Desktop table (>=md) */}
      <div className="hidden md:block flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
              <th className="w-12 px-4 py-3">
                <input type="checkbox" checked={allSelected} onChange={toggleAll}
                  className="w-4 h-4 rounded border-gray-300 accent-brand-500" />
              </th>
              <th className="text-left px-4 py-3 font-semibold">Name</th>
              <th className="text-left px-4 py-3 font-semibold">SSO</th>
              <th className="text-left px-4 py-3 font-semibold">Nationality</th>
              <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">
                Height <SortBtn col="height" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              </th>
              <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">
                Weight <SortBtn col="weight" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              </th>
              <th className="text-left px-4 py-3 font-semibold">Home Show &amp; Role</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
              <th className="text-left px-4 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-50">
            {pageRows.length === 0 && (
              <tr><td colSpan={9} className="text-center py-16 text-gray-300 text-sm">
                {!showUnassigned && !selectedRole ? "Select a role to view performers" : "No performers found"}
              </td></tr>
            )}
            {pageRows.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleOne(p.id)}
                      className="w-4 h-4 rounded border-gray-300 accent-brand-500" />
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2.5">
                    <img src={p.photoUrl} alt={p.name} className="w-8 h-8 rounded-full object-cover object-top ring-1 ring-gray-100" />
                    <span className="font-medium text-gray-900">{p.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-gray-500 text-xs">{p.ssoId}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.flag} {p.nationality}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.height}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.weight}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                  {p.homeShow ? <>{p.homeShow} &amp; <span className="text-gray-800">{p.homeRole}</span></> : "—"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <button onClick={(e) => {
                    const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                    openRowStatusMenu(p.id, { top: r.bottom + 6, left: Math.max(8, r.left) });
                  }} className="inline-flex">
                    <StatusBadge status={statusOf(p)} />
                  </button>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <button onClick={() => onOpenActor(p.id)} className="text-xs text-brand-500 hover:text-brand-700 font-medium transition-colors">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Paginator page={safeP} totalPages={totalPages} pageSize={pageSize} pageSizeOptions={[10, 20, 50]}
        totalItems={sorted.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
      {markMenu && (() => {
        const cur = markMenu.single ? (findActorById(markMenu.ids[0]) ? statusOf(findActorById(markMenu.ids[0])!) : undefined) : undefined;
        return <MarkStatusMenu anchor={markMenu.anchor}
          current={cur}
          count={markMenu.single ? undefined : markMenu.ids.length}
          onClose={() => setMarkMenu(null)} onPick={applyStatusPick} />;
      })()}
      {offboardIds && (
        <OffboardingDialog count={offboardIds.length}
          onClose={() => { setOffboardIds(null); setMarkMenu(null); }}
          onConfirm={() => {
            setStatusFor(offboardIds, "Inactive");
            if (!markMenu?.single) setSelectedIds(new Set());
            setMarkMenu(null);
          }} />
      )}
    </div>
  );
}

// ── Left Sidebar ───────────────────────────────────────────────────────────

function LeftSidebar({
  selectedShowId, selectedRoleId, showUnassigned,
  onSelectUnassigned, onSelectRole, onSelectAll,
  isMobileOpen, onClose,
}: {
  selectedShowId: string | null; selectedRoleId: string | null; showUnassigned: boolean;
  onSelectUnassigned: () => void;
  onSelectRole: (showId: string, roleId: string) => void;
  onSelectAll: () => void;
  isMobileOpen: boolean;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [expandedShowIds, setExpandedShowIds] = useState<Set<string>>(
    () => new Set(selectedShowId ? [selectedShowId] : []),
  );
  const [regularExpanded, setRegularExpanded] = useState(true);
  const [specialExpanded, setSpecialExpanded] = useState(false);

  const unassignedCount = PERFORMERS.filter((p) => !p.homeShow).length;
  const allShows = DATA.flatMap((l) => l.shows);
  const regularShowTotal = allShows.reduce((sum, s) => sum + s.roles.reduce((rs, r) => rs + r.homeActors.length, 0), 0);

  const matchesSearch = (text: string) => !search || text.toLowerCase().includes(search.toLowerCase());

  function toggleExpand(showId: string) {
    setExpandedShowIds((p) => {
      const n = new Set(p);
      if (n.has(showId)) n.delete(showId); else n.add(showId);
      return n;
    });
  }

  return (
    <aside
      className={`bg-white border-r border-gray-200 flex flex-col flex-shrink-0 fixed inset-y-0 left-0 z-40 w-72 transform transition-transform duration-200 ease-out md:static md:translate-x-0 md:w-64 md:transform-none md:transition-none ${isMobileOpen ? "translate-x-0 shadow-xl" : "-translate-x-full"}`}
    >
      {/* Mobile drawer header (close button) */}
      <div className="md:hidden flex items-center justify-between px-3 h-12 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-700">Navigation</span>
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="p-2 -mr-2 rounded-md text-gray-500 hover:bg-gray-100"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {/* Search */}
      <div className="px-3 py-2 border-b border-gray-100">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Show or role name"
          className="w-full h-8 px-2.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-200 placeholder:text-gray-300" />
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 text-sm">
        {/* All Performers */}
        <button onClick={onSelectAll}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors mb-1 ${!showUnassigned && !selectedShowId ? "bg-brand-50 text-brand-700 font-semibold" : "text-gray-700 hover:bg-gray-50"}`}>
          <span>All Performers</span>
          <span className={`text-xs ${!showUnassigned && !selectedShowId ? "text-brand-600" : "text-gray-400"}`}>({ALL_ACTORS_BY_SSO.length})</span>
        </button>

        {/* Regular Show group */}
        <div>
          <button onClick={() => setRegularExpanded((p) => !p)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-brand-700 font-bold hover:bg-gray-50 transition-colors">
            <span>Regular Show <span className="text-gray-500 font-normal text-xs">({regularShowTotal})</span></span>
            {regularExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {regularExpanded && allShows.map((show) => {
            const showCount = show.roles.reduce((s, r) => s + r.homeActors.length, 0);
            const expanded = expandedShowIds.has(show.id);
            const showMatches = matchesSearch(show.name);
            const matchingRoles = show.roles.filter((r) => showMatches || matchesSearch(r.name));
            if (search && !showMatches && matchingRoles.length === 0) return null;
            const hasSelectedRole = show.id === selectedShowId && !showUnassigned && selectedRoleId !== null;
            return (
              <div key={show.id}>
                <button onClick={() => toggleExpand(show.id)}
                  className={`w-full flex items-center justify-between pl-6 pr-3 py-1.5 rounded-lg text-left transition-colors ${hasSelectedRole ? "text-brand-700 font-medium" : "text-gray-700 hover:bg-gray-50"}`}>
                  <span className="flex items-center gap-1.5">
                    <span>{show.name}</span>
                    <span className={`text-xs ${hasSelectedRole ? "text-brand-500" : "text-gray-400"}`}>({showCount})</span>
                  </span>
                  {show.roles.length > 0 && (expanded
                    ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                    : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />)}
                </button>
                {expanded && matchingRoles.map((role) => {
                  const isRoleSelected = role.id === selectedRoleId && !showUnassigned;
                  return (
                    <button key={role.id} onClick={() => onSelectRole(show.id, role.id)}
                      className={`w-full flex items-center justify-between pl-12 pr-3 py-1.5 rounded-lg text-left text-xs transition-colors ${isRoleSelected ? "bg-brand-100 text-brand-700 font-semibold" : "text-gray-600 hover:bg-gray-50"}`}>
                      <span>{role.name}</span>
                      <span className={`${isRoleSelected ? "text-brand-500" : "text-gray-400"}`}>({role.homeActors.length})</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Special Event */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <button onClick={() => setSpecialExpanded((p) => !p)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-gray-700 font-bold hover:bg-gray-50 transition-colors">
            <span>Special Event</span>
            {specialExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {specialExpanded && (
            <p className="px-6 py-2 text-xs text-gray-300">No special events</p>
          )}
        </div>

        {/* Unassigned (always at the bottom) */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <button onClick={onSelectUnassigned}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${showUnassigned ? "bg-brand-50 text-brand-700 font-semibold" : "text-gray-700 hover:bg-gray-50"}`}>
            <span>Unassigned</span>
            <span className={`text-xs ${showUnassigned ? "text-brand-600" : "text-gray-400"}`}>({unassignedCount})</span>
          </button>
        </div>
      </nav>
    </aside>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function CastingBookPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const actorParam = searchParams.get("actor");
  const sectionParam = searchParams.get("section") === "basic" ? "basic" : null;

  const [selectedShowId, setSelectedShowId] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [castTab, setCastTab] = useState<"home" | "swing">("home");
  const [assignTarget, setAssignTarget] = useState<AssignTarget | null>(null);
  const [assignPerformersOpen, setAssignPerformersOpen] = useState(false);
  // Excel imports + auxiliary ops (PC-only flows per 0522 spec)
  const [importModal, setImportModal] = useState<null | "performers" | "events" | "skills" | "swing" | "sso" | "basicinfo" | "photos">(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [statusOverrides, setStatusOverrides] = useState<Record<number, ActorStatus>>({});

  const statusOf = useCallback(
    (a: Actor) => statusOverrides[a.id] ?? a.status ?? "Active",
    [statusOverrides],
  );
  const setStatusFor = useCallback((ids: number[], status: ActorStatus) => {
    setStatusOverrides((prev) => {
      const next = { ...prev };
      ids.forEach((id) => { next[id] = status; });
      return next;
    });
  }, []);
  const statusCtxValue = useMemo(() => ({ statusOf, setStatusFor }), [statusOf, setStatusFor]);

  function closeSidebarOnMobile() {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }

  const allShowsFlat = useMemo(() => DATA.flatMap((l) => l.shows), []);
  const selectedShow = useMemo(() => allShowsFlat.find((s) => s.id === selectedShowId) ?? null, [allShowsFlat, selectedShowId]);
  const selectedRole = useMemo(() => selectedRoleId ? selectedShow?.roles.find((r) => r.id === selectedRoleId) ?? null : null, [selectedShow, selectedRoleId]);

  function selectRole(showId: string, roleId: string) {
    setSelectedShowId(showId);
    setSelectedRoleId(roleId);
    setCastTab("home");
    setShowUnassigned(false);
  }

  const drawerActor = useMemo(() => {
    if (!actorParam) return null;
    const id = Number(actorParam);
    if (Number.isNaN(id)) return null;
    return findActorById(id);
  }, [actorParam]);

  const pageTitle = drawerActor
    ? sectionParam === "basic"
      ? `${drawerActor.name} — Basic Info`
      : drawerActor.name
    : showUnassigned
      ? "Unassigned — Casting Book"
      : selectedRole
        ? `${selectedShow?.name ?? ""} / ${selectedRole.name} — Casting Book`
        : "Casting Book";
  useDocumentTitle(pageTitle);

  const openActor = useCallback(
    (id: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("actor", String(id));
      params.delete("section");
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const closeActor = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("actor");
    params.delete("section");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }, [pathname, router, searchParams]);

  const openActorSection = useCallback(
    (s: "basic" | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (s) params.set("section", s);
      else params.delete("section");
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams],
  );

  return (
    <StatusCtx.Provider value={statusCtxValue}>
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* WeCom embeds the app under its own native title bar, so we render only a
          thin action row here (no duplicate title) — just the nav trigger. */}
      <header className="md:hidden bg-white border-b border-gray-100 flex-shrink-0 h-9 px-1.5 flex items-center gap-2 z-30">
        <button
          type="button"
          aria-label="Open navigation"
          onClick={() => setSidebarOpen(true)}
          className="p-1.5 rounded-md text-gray-600 hover:bg-gray-100"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-xs text-gray-400 truncate">
          {showUnassigned
            ? "Unassigned"
            : selectedRole
              ? `${selectedShow?.name ?? ""} / ${selectedRole.name}`
              : ""}
        </span>
      </header>
      {/* Desktop header */}
      <header className="hidden md:flex bg-white border-b border-gray-200 flex-shrink-0 h-14 px-4 sm:px-5 items-center gap-3 z-30">
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-5 h-5 text-brand-500" />
          <span className="font-bold text-gray-900 text-base">Casting Book</span>
        </div>
      </header>

      {/* Sidebar + Main Content (left-right layout) */}
      <div className="flex-1 min-h-0 flex relative">
        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 z-30 bg-black/40"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
        <LeftSidebar
          selectedShowId={selectedShowId}
          selectedRoleId={selectedRoleId}
          showUnassigned={showUnassigned}
          onSelectUnassigned={() => { setShowUnassigned(true); setSelectedShowId(null); setSelectedRoleId(null); closeSidebarOnMobile(); }}
          onSelectRole={(showId, roleId) => { selectRole(showId, roleId); closeSidebarOnMobile(); }}
          onSelectAll={() => { setShowUnassigned(false); setSelectedShowId(null); setSelectedRoleId(null); closeSidebarOnMobile(); }}
          isMobileOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            <CardView selectedShow={selectedShow} selectedRole={selectedRole}
              castTab={castTab} setCastTab={setCastTab}
              onCast={(ids) => setAssignTarget({
                ids,
                defaultShow: selectedShow?.name,
                defaultRole: selectedRole?.name,
                defaultRoleType: castTab,
              })}
              onAssignPerformers={() => setAssignPerformersOpen(true)}
              showUnassigned={showUnassigned}
              onOpenActor={openActor}
              onImportPerformers={() => setImportModal("performers")}
              onImportEvents={() => setImportModal("events")}
              onImportSkills={() => setImportModal("skills")}
              onImportSwing={() => setImportModal("swing")}
              onReplaceSso={() => setImportModal("sso")}
              onUpdateBasicInfo={() => setImportModal("basicinfo")}
              onBatchPhotos={() => setImportModal("photos")}
            />
        </div>
      </div>

      {drawerActor && (
        <ActorDetailDrawer
          actor={drawerActor}
          roleLabel={`${drawerActor.homeShow ?? "—"} / ${drawerActor.homeRole ?? "—"}`}
          section={sectionParam}
          onClose={closeActor}
          onOpenSection={openActorSection}
        />
      )}

      {assignTarget && (
        <BatchAssignDialog
          target={assignTarget}
          onClose={() => setAssignTarget(null)}
          onSubmit={() => setAssignTarget(null)}
        />
      )}
      {assignPerformersOpen && selectedShow && selectedRole && (
        <AssignPerformersDialog
          show={selectedShow}
          role={selectedRole}
          defaultRoleType={castTab}
          onClose={() => setAssignPerformersOpen(false)}
          onSubmit={() => setAssignPerformersOpen(false)}
        />
      )}
      {importModal === "performers" && <RosterImportModal onClose={() => setImportModal(null)} />}
      {importModal === "basicinfo" && <BasicInfoImportModal onClose={() => setImportModal(null)} />}
      {importModal === "events" && <EventImportModal onClose={() => setImportModal(null)} />}
      {importModal === "skills" && <SkillImportModal onClose={() => setImportModal(null)} />}
      {importModal === "swing" && <SwingImportModal onClose={() => setImportModal(null)} />}
      {importModal === "sso" && <SsoReplacementModal onClose={() => setImportModal(null)} />}
      {importModal === "photos" && <BatchPhotoUploadModal onClose={() => setImportModal(null)} />}
    </div>
    </StatusCtx.Provider>
  );
}
