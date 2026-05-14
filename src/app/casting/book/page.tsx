/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useMemo, useRef } from "react";
import {
  BookOpen, X, Pencil, Upload, Play, ChevronDown, ChevronUp,
  ArrowUp, ArrowDown, ArrowUpDown, LayoutGrid, List,
  Search, RotateCcw, Eye, Users, Film, Plus, Paperclip,
  ChevronLeft, ChevronRight, Camera, Download, FileSpreadsheet,
  Filter, Check, Save,
} from "lucide-react";
import * as XLSX from "xlsx";

// ── Types ──────────────────────────────────────────────────────────────────

interface MediaFile { type: "photo" | "video"; url: string; duration?: string; note?: string }
interface SkillEntry { id: string; type: string; skill: string }
interface SwingRecord { id: string; showName: string; roleName: string; note: string; createdAt: string; status: "active" | "inactive" }
interface EventRecord { id: string; eventName: string; roleName: string; startDate: string; endDate: string; status: "active" | "inactive" }
interface Measurements { height: number; weight: number; chest: number; waist: number; hip: number; inseam: number; shoeSize: number }
interface Attachment { id: string; name: string; fileType: string }

interface Actor {
  id: number; ssoId: string; name: string; nationality: string; flag: string;
  height: number; weight: number; photoUrl: string;
  homeShow?: string; homeRole?: string; contractEndDate?: string;
  skillEntries?: SkillEntry[];
  mediaFiles?: MediaFile[]; swingRecords?: SwingRecord[]; eventRecords?: EventRecord[];
  measurements?: Measurements; attachments?: Attachment[];
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

const ALL_SKILL_FLAT = SKILLSET_CATEGORIES.flatMap((c) => c.skills);

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
const EVENT_NAMES = ["Summer Spectacular", "Christmas Parade", "Halloween Night", "Grand Opening Gala", "Anniversary Show", "VIP Preview Night", "Media Day", "Charity Event"];
const EVENT_ROLE_POOL = ["Lead Performer", "Ensemble", "Character", "Stunt Double", "Aerial Artist", "Host"];
const ATTACHMENT_NAMES = ["Resume_2024.pdf", "Headshot_2023.pdf", "Demo_Reel.mp4", "Contract.pdf", "Portfolio.pdf"];
const MEDIA_NOTES = ["Front pose, natural lighting", "Character makeup rehearsal", "Training reel clip", "Stage performance", "", "", "Showcase 2024", ""];

function dHash(n: number): number {
  let x = n ^ (n >>> 16);
  x = Math.imul(x, 0x45d9f3b);
  x = x ^ (x >>> 16);
  return Math.abs(x);
}

function genMeasurements(seed: number, height: number, weight: number): Measurements {
  const h = dHash(seed * 23);
  return {
    height, weight,
    chest: 78 + (h % 22),
    waist: 58 + (dHash(seed * 7) % 22),
    hip: 82 + (dHash(seed * 11) % 18),
    inseam: 68 + (dHash(seed * 13) % 15),
    shoeSize: 36 + (dHash(seed * 17) % 10),
  };
}

function genAttachments(seed: number): Attachment[] {
  const count = dHash(seed * 29) % 3;
  return Array.from({ length: count }, (_, i) => ({
    id: `att-${seed}-${i}`,
    name: ATTACHMENT_NAMES[dHash(seed * 3 + i) % ATTACHMENT_NAMES.length],
    fileType: ATTACHMENT_NAMES[dHash(seed * 3 + i) % ATTACHMENT_NAMES.length].endsWith(".mp4") ? "video" : "pdf",
  }));
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
      ssoId: `${100000 + (dHash(seed * 5 + i) % 900000)}`,
      name: pool.name, nationality: pool.nationality, flag: pool.flag,
      height, weight,
      photoUrl: `https://randomuser.me/api/portraits/${pool.gender}/${photoNum}.jpg`,
      measurements: genMeasurements(seed * 100 + i, height, weight),
      attachments: genAttachments(seed * 100 + i),
    };
  });
}

function genSwingRecords(seed: number): SwingRecord[] {
  const count = dHash(seed * 7) % 4;
  return Array.from({ length: count }, (_, i) => {
    const h = dHash(seed * 11 + i);
    const daysAgo = (h % 365) + 30;
    const date = new Date(Date.now() - daysAgo * 86400000);
    const notes = ["Primary swing cover", "Emergency cover only", ""];
    return {
      id: `sw-${seed}-${i}`,
      showName: SWING_SHOWS[h % SWING_SHOWS.length],
      roleName: SWING_ROLES[dHash(seed * 3 + i) % SWING_ROLES.length],
      note: notes[i % notes.length],
      createdAt: date.toISOString().split("T")[0],
      status: (h % 5 === 0 ? "inactive" : "active") as "active" | "inactive",
    };
  });
}

function genEventRecords(seed: number): EventRecord[] {
  const count = (dHash(seed * 5) % 4) + 1;
  return Array.from({ length: count }, (_, i) => {
    const h = dHash(seed * 13 + i);
    const daysAgoStart = (h % 730) + 60;
    const duration = (dHash(seed * 19 + i) % 90) + 3;
    const startMs = Date.now() - daysAgoStart * 86400000;
    const endMs = startMs + duration * 86400000;
    return {
      id: `ev-${seed}-${i}`,
      eventName: EVENT_NAMES[h % EVENT_NAMES.length],
      roleName: EVENT_ROLE_POOL[dHash(seed * 7 + i) % EVENT_ROLE_POOL.length],
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
  const mediaFiles: MediaFile[] = [
    {
      type: "video",
      url: `https://randomuser.me/api/portraits/${pool.gender}/${photoNum}.jpg`,
      duration: `0${2 + (dHash(seed * 5) % 5)}:${String(dHash(seed * 17) % 60).padStart(2, "0")}`,
      note: MEDIA_NOTES[dHash(seed * 23) % MEDIA_NOTES.length],
    },
    ...Array.from({ length: 4 + (dHash(seed * 2) % 3) }, (_, i) => ({
      type: "photo" as const,
      url: `https://randomuser.me/api/portraits/${pool.gender}/${((photoNum + i + 1) % 70) + 1}.jpg`,
      note: MEDIA_NOTES[dHash(seed * 29 + i) % MEDIA_NOTES.length],
    })),
  ];
  const height = 160 + (dHash(seed) % 26);
  const weight = 48 + (dHash(seed * 2) % 35);
  return {
    id: 9000 + seed, ssoId: `2001${String(7000 + dHash(seed * 19) % 3000)}`,
    name: pool.name, nationality: pool.nationality, flag: pool.flag,
    height, weight,
    photoUrl: `https://randomuser.me/api/portraits/${pool.gender}/${photoNum}.jpg`,
    homeShow: pair.show, homeRole: pair.role,
    contractEndDate: CONTRACT_DATES[dHash(seed * 3) % CONTRACT_DATES.length],
    skillEntries: genSkillEntries(seed),
    mediaFiles, swingRecords: genSwingRecords(seed), eventRecords: genEventRecords(seed),
    measurements: genMeasurements(seed, height, weight),
    attachments: genAttachments(seed),
  };
}

const PERFORMERS: Actor[] = Array.from({ length: 80 }, (_, i) => genPerformer(i + 1));

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
          className="h-7 px-1.5 border border-gray-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-200">
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

// ── Section Header ─────────────────────────────────────────────────────────

function SectionHeader({ title, count, editing, onToggleCollapse, collapsed, onEdit, onSave, onCancel, onAdd, addLabel }: {
  title: string; count?: number; editing: boolean;
  onToggleCollapse: () => void; collapsed: boolean;
  onEdit?: () => void; onSave?: () => void; onCancel?: () => void;
  onAdd?: () => void; addLabel?: string;
}) {
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
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium px-2 py-1 rounded hover:bg-indigo-50 transition-colors">
            <Plus className="w-3 h-3" />{addLabel ?? "Add"}
          </button>
        )}
        {!editing && !collapsed && onEdit && (
          <button onClick={onEdit}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium px-2 py-1 rounded hover:bg-gray-100 transition-colors">
            <Pencil className="w-3 h-3" />Edit
          </button>
        )}
        {editing && (
          <>
            <button onClick={onCancel}
              className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-gray-600 hover:bg-white transition-colors">Cancel</button>
            <button onClick={onSave}
              className="flex items-center gap-1 text-xs px-2.5 py-1 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors">
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

// ── Actor Detail Drawer ────────────────────────────────────────────────────

function ActorDetailDrawer({ actor, roleLabel, onClose }: {
  actor: Actor; roleLabel: string; onClose: () => void;
}) {
  const headshotInputRef = useRef<HTMLInputElement>(null);
  const [headshotUrl, setHeadshotUrl] = useState(actor.photoUrl);

  const [collapsed, setCollapsed] = useState({
    skills: false, portfolio: true, showRole: false,
    measurements: true, event: true, attachments: true,
  });
  const toggle = (s: keyof typeof collapsed) => setCollapsed((p) => ({ ...p, [s]: !p[s] }));

  // ── Skill section ──────────────────────────────────────────────────────
  const [skillEntries, setSkillEntries] = useState<SkillEntry[]>(actor.skillEntries ?? []);
  const [addingSkill, setAddingSkill] = useState(false);
  const [skillForm, setSkillForm] = useState({ type: "", skill: "" });
  const skillsForType = SKILLSET_CATEGORIES.find((c) => c.type === skillForm.type)?.skills ?? [];

  function saveSkill() {
    if (!skillForm.type || !skillForm.skill) return;
    if (skillEntries.find((e) => e.type === skillForm.type && e.skill === skillForm.skill)) {
      setAddingSkill(false);
      setSkillForm({ type: "", skill: "" });
      return;
    }
    setSkillEntries((p) => [...p, { id: `sk-${Date.now()}`, type: skillForm.type, skill: skillForm.skill }]);
    setSkillForm({ type: "", skill: "" });
    setAddingSkill(false);
  }

  // ── Portfolio section ──────────────────────────────────────────────────
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>(actor.mediaFiles ?? []);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [addingMedia, setAddingMedia] = useState(false);
  const [mediaForm, setMediaForm] = useState({ note: "" });

  function saveMedia() {
    const photoNum = ((Date.now() % 70) + 1);
    setMediaFiles((p) => [...p, { type: "photo", url: `https://randomuser.me/api/portraits/men/${photoNum}.jpg`, note: mediaForm.note }]);
    setMediaForm({ note: "" });
    setAddingMedia(false);
  }

  // ── Show & Role section ────────────────────────────────────────────────
  const [swingRecords, setSwingRecords] = useState<SwingRecord[]>(actor.swingRecords ?? []);
  const [addingSwing, setAddingSwing] = useState(false);
  const [swingForm, setSwingForm] = useState({ showName: "", roleName: "", note: "" });
  const [editingSwingId, setEditingSwingId] = useState<string | null>(null);
  const [editSwingForm, setEditSwingForm] = useState({ showName: "", roleName: "", note: "" });

  function saveSwing() {
    if (!swingForm.showName || !swingForm.roleName) return;
    setSwingRecords((p) => [{ id: `sw-${Date.now()}`, ...swingForm, createdAt: new Date().toISOString().split("T")[0], status: "active" }, ...p]);
    setSwingForm({ showName: "", roleName: "", note: "" });
    setAddingSwing(false);
  }

  function startEditSwing(rec: SwingRecord) {
    setEditingSwingId(rec.id);
    setEditSwingForm({ showName: rec.showName, roleName: rec.roleName, note: rec.note });
  }

  function saveEditSwing(id: string) {
    setSwingRecords((p) => p.map((r) => r.id === id ? { ...r, ...editSwingForm } : r));
    setEditingSwingId(null);
  }

  // ── Measurements section ───────────────────────────────────────────────
  const [meas, setMeas] = useState<Measurements>(
    actor.measurements ?? { height: actor.height, weight: actor.weight, chest: 85, waist: 65, hip: 90, inseam: 75, shoeSize: 40 }
  );
  const [editingMeas, setEditingMeas] = useState(false);
  const [measDraft, setMeasDraft] = useState<Measurements>(meas);

  // ── Event Experience section ───────────────────────────────────────────
  const [eventRecords, setEventRecords] = useState<EventRecord[]>(actor.eventRecords ?? []);
  const [addingEvent, setAddingEvent] = useState(false);
  const [eventForm, setEventForm] = useState({ eventName: "", roleName: "", startDate: "", endDate: "" });
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editEventForm, setEditEventForm] = useState({ eventName: "", roleName: "", startDate: "", endDate: "" });

  function saveEvent() {
    if (!eventForm.eventName || !eventForm.startDate) return;
    setEventRecords((p) => [{ id: `ev-${Date.now()}`, ...eventForm, status: "active" }, ...p]);
    setEventForm({ eventName: "", roleName: "", startDate: "", endDate: "" });
    setAddingEvent(false);
  }

  function startEditEvent(rec: EventRecord) {
    setEditingEventId(rec.id);
    setEditEventForm({ eventName: rec.eventName, roleName: rec.roleName, startDate: rec.startDate, endDate: rec.endDate });
  }

  function saveEditEvent(id: string) {
    setEventRecords((p) => p.map((r) => r.id === id ? { ...r, ...editEventForm } : r));
    setEditingEventId(null);
  }

  // ── Attachments section ────────────────────────────────────────────────
  const [attachments, setAttachments] = useState<Attachment[]>(actor.attachments ?? []);
  const attachInputRef = useRef<HTMLInputElement>(null);

  function handleAttachFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const newAtts: Attachment[] = Array.from(files).map((f) => ({
      id: `att-${Date.now()}-${Math.random()}`,
      name: f.name,
      fileType: f.type.includes("video") ? "video" : "pdf",
    }));
    setAttachments((p) => [...p, ...newAtts]);
    e.target.value = "";
  }

  const inputCls = "w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300";
  const labelCls = "block text-xs text-gray-400 mb-1";

  const activeSwingCount = swingRecords.filter((r) => r.status === "active").length;
  const activeEventCount = eventRecords.filter((r) => r.status === "active").length;

  return (
    <>
      {lightboxIdx !== null && (
        <Lightbox files={mediaFiles} initialIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
      <input ref={headshotInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setHeadshotUrl(URL.createObjectURL(f));
          e.target.value = "";
        }} />
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[480px] bg-white shadow-2xl flex flex-col">

        {/* Photo header with headshot replacement */}
        <div className="relative flex-shrink-0 h-48 bg-gray-100 group/headshot">
          <img src={headshotUrl} alt={actor.name} className="w-full h-full object-cover object-top" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <button onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
          {/* Replace headshot button */}
          <button onClick={() => headshotInputRef.current?.click()}
            className="absolute top-4 right-14 w-8 h-8 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition-colors opacity-0 group-hover/headshot:opacity-100">
            <Camera className="w-4 h-4" />
          </button>
          <div className="absolute bottom-4 left-5 right-5">
            <p className="text-xs text-gray-300 mb-0.5">{roleLabel}</p>
            <p className="text-xl font-bold text-white leading-tight truncate">{actor.name}</p>
          </div>
        </div>

        {/* Basic Info — always read-only */}
        <div className="flex-shrink-0 grid grid-cols-5 border-b border-gray-100">
          {[
            { label: "SSO", value: actor.ssoId, mono: true },
            { label: "Nationality", value: `${actor.flag} ${actor.nationality}` },
            { label: "Height", value: `${meas.height} cm` },
            { label: "Weight", value: `${meas.weight} kg` },
            { label: "Contract End", value: actor.contractEndDate ?? "—" },
          ].map(({ label, value, mono }) => (
            <div key={label} className="px-2 py-2.5 text-center border-r border-gray-100 last:border-r-0">
              <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
              <p className={`text-[11px] font-semibold text-gray-800 leading-snug truncate ${mono ? "font-mono" : ""}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Scrollable sections */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Skillset ── */}
          <div className="border-b border-gray-100">
            <SectionHeader
              title="Skillset" count={skillEntries.length}
              editing={addingSkill} collapsed={collapsed.skills}
              onToggleCollapse={() => toggle("skills")}
              onAdd={() => setAddingSkill(true)} addLabel="Add"
              onCancel={() => { setAddingSkill(false); setSkillForm({ type: "", skill: "" }); }}
              onSave={saveSkill}
            />
            {!collapsed.skills && (
              <div className="px-5 pb-4">
                {/* Add form */}
                {addingSkill && (
                  <div className="mb-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
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
                    </div>
                  </div>
                )}
                {/* Skill tags */}
                {skillEntries.length === 0 && !addingSkill ? (
                  <p className="text-xs text-gray-300 py-2">No skills added</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {skillEntries.map((e) => (
                      <span key={e.id}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full font-medium ${SKILL_TAG_COLORS[e.type] ?? "bg-gray-100 text-gray-600"}`}>
                        <span className="opacity-60 text-[10px]">{e.type}</span>
                        <span>{e.skill}</span>
                        <button onClick={() => setSkillEntries((p) => p.filter((x) => x.id !== e.id))}
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

          {/* ── Portfolio ── */}
          <div className="border-b border-gray-100">
            <SectionHeader
              title="Portfolio" count={mediaFiles.length}
              editing={addingMedia} collapsed={collapsed.portfolio}
              onToggleCollapse={() => toggle("portfolio")}
              onAdd={() => setAddingMedia(true)} addLabel="Add"
              onCancel={() => { setAddingMedia(false); setMediaForm({ note: "" }); }}
              onSave={saveMedia}
            />
            {!collapsed.portfolio && (
              <div className="px-5 pb-4">
                {/* Add form */}
                {addingMedia && (
                  <div className="mb-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100 space-y-2">
                    <div className="rounded-xl border-2 border-dashed border-indigo-200 h-20 flex flex-col items-center justify-center gap-1 text-indigo-300 hover:text-indigo-400 cursor-pointer transition-colors">
                      <Upload className="w-4 h-4" />
                      <span className="text-xs">Click to select photo or video</span>
                    </div>
                    <div>
                      <label className={labelCls}>Note (optional)</label>
                      <input value={mediaForm.note} onChange={(e) => setMediaForm({ note: e.target.value })}
                        className={inputCls} placeholder="e.g. Stage performance, natural lighting" />
                    </div>
                  </div>
                )}
                {mediaFiles.length === 0 && !addingMedia ? (
                  <p className="text-xs text-gray-300 py-3 text-center">No media files</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
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
                          <button onClick={() => setMediaFiles((p) => p.filter((_, idx) => idx !== i))}
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
              </div>
            )}
          </div>

          {/* ── Show & Role (Home + Swing) ── */}
          <div className="border-b border-gray-100">
            <SectionHeader
              title="Show & Role" count={(actor.homeShow ? 1 : 0) + activeSwingCount}
              editing={addingSwing} collapsed={collapsed.showRole}
              onToggleCollapse={() => toggle("showRole")}
              onAdd={() => setAddingSwing(true)} addLabel="Add Swing"
              onCancel={() => { setAddingSwing(false); setSwingForm({ showName: "", roleName: "", note: "" }); }}
              onSave={saveSwing}
            />
            {!collapsed.showRole && (
              <div className="px-5 pb-4 space-y-2">
                {/* Home assignment */}
                {actor.homeShow && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-gray-900">{actor.homeShow}</span>
                        <span className="text-xs text-gray-300">/</span>
                        <span className="text-xs font-medium text-indigo-600">{actor.homeRole}</span>
                      </div>
                      {actor.contractEndDate && <p className="text-xs text-gray-400 mt-0.5">Expires {actor.contractEndDate}</p>}
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-indigo-500 text-white rounded-full font-medium flex-shrink-0">Home</span>
                  </div>
                )}
                {/* Add swing form */}
                {addingSwing && (
                  <div className="p-3 bg-amber-50 rounded-xl space-y-2 border border-amber-100">
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className={labelCls}>Show</label>
                        <select value={swingForm.showName} onChange={(e) => setSwingForm((f) => ({ ...f, showName: e.target.value }))} className={inputCls + " bg-white"}>
                          <option value="">Select</option>
                          {DATA.flatMap((l) => l.shows).map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                      </div>
                      <div><label className={labelCls}>Role</label>
                        <select value={swingForm.roleName}
                          onChange={(e) => setSwingForm((f) => ({ ...f, roleName: e.target.value }))}
                          disabled={!swingForm.showName}
                          className={inputCls + " bg-white disabled:opacity-50"}>
                          <option value="">Select</option>
                          {DATA.flatMap((l) => l.shows).find((s) => s.name === swingForm.showName)?.roles.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div><label className={labelCls}>Note</label>
                      <input value={swingForm.note} onChange={(e) => setSwingForm((f) => ({ ...f, note: e.target.value }))} className={inputCls} placeholder="Optional" />
                    </div>
                  </div>
                )}
                {/* Swing records */}
                {swingRecords.map((rec) => (
                  <div key={rec.id} className={`p-3 rounded-xl border transition-opacity ${rec.status === "inactive" ? "border-gray-100 opacity-40" : "border-amber-100 bg-amber-50"}`}>
                    {editingSwingId === rec.id ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div><label className={labelCls}>Show</label>
                            <select value={editSwingForm.showName} onChange={(e) => setEditSwingForm((f) => ({ ...f, showName: e.target.value }))} className={inputCls + " bg-white"}>
                              {DATA.flatMap((l) => l.shows).map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                            </select>
                          </div>
                          <div><label className={labelCls}>Role</label>
                            <input value={editSwingForm.roleName} onChange={(e) => setEditSwingForm((f) => ({ ...f, roleName: e.target.value }))} className={inputCls} />
                          </div>
                        </div>
                        <div><label className={labelCls}>Note</label>
                          <input value={editSwingForm.note} onChange={(e) => setEditSwingForm((f) => ({ ...f, note: e.target.value }))} className={inputCls} />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingSwingId(null)} className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-gray-600">Cancel</button>
                          <button onClick={() => saveEditSwing(rec.id)} className="text-xs px-2.5 py-1 bg-amber-500 text-white rounded-lg">Save</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-gray-900">{rec.showName}</span>
                            <span className="text-xs text-gray-300">/</span>
                            <span className="text-xs font-medium text-amber-700">{rec.roleName}</span>
                          </div>
                          {rec.note && <p className="text-xs text-gray-400 mt-0.5">{rec.note}</p>}
                          <p className="text-xs text-gray-400 mt-0.5">{rec.createdAt}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs px-2 py-0.5 bg-amber-400 text-amber-900 rounded-full font-medium">Swing</span>
                          {rec.status === "active" && (
                            <>
                              <button onClick={() => startEditSwing(rec)} className="text-xs text-gray-400 hover:text-gray-700 px-1.5 py-0.5 rounded hover:bg-gray-100 transition-colors">Edit</button>
                              <button onClick={() => setSwingRecords((p) => p.map((r) => r.id === rec.id ? { ...r, status: "inactive" } : r))}
                                className="text-xs text-red-400 hover:text-red-600 px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors">Remove</button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {swingRecords.length === 0 && !addingSwing && !actor.homeShow && (
                  <p className="text-xs text-gray-300 py-3 text-center">No show assignments</p>
                )}
              </div>
            )}
          </div>

          {/* ── Measurements ── */}
          <div className="border-b border-gray-100">
            <SectionHeader
              title="Measurements"
              editing={editingMeas} collapsed={collapsed.measurements}
              onToggleCollapse={() => toggle("measurements")}
              onEdit={() => { setMeasDraft({ ...meas }); setEditingMeas(true); }}
              onSave={() => { setMeas(measDraft); setEditingMeas(false); }}
              onCancel={() => setEditingMeas(false)}
            />
            {!collapsed.measurements && (
              <div className="px-5 pb-4">
                {editingMeas ? (
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      ["Height (cm)", "height"], ["Weight (kg)", "weight"], ["Chest (cm)", "chest"],
                      ["Waist (cm)", "waist"], ["Hip (cm)", "hip"], ["Inseam (cm)", "inseam"],
                      ["Shoe Size (EU)", "shoeSize"],
                    ] as [string, keyof Measurements][]).map(([lbl, key]) => (
                      <div key={key}>
                        <label className={labelCls}>{lbl}</label>
                        <input type="number" value={measDraft[key]}
                          onChange={(e) => setMeasDraft((p) => ({ ...p, [key]: +e.target.value }))}
                          className={inputCls} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      ["Height", `${meas.height} cm`], ["Weight", `${meas.weight} kg`],
                      ["Chest", `${meas.chest} cm`], ["Waist", `${meas.waist} cm`],
                      ["Hip", `${meas.hip} cm`], ["Inseam", `${meas.inseam} cm`],
                      ["Shoe Size", `EU ${meas.shoeSize}`],
                    ] as [string, string][]).map(([lbl, val]) => (
                      <div key={lbl} className="bg-gray-50 rounded-lg p-2.5">
                        <p className="text-[10px] text-gray-400 mb-0.5">{lbl}</p>
                        <p className="text-xs font-semibold text-gray-800">{val}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Event Experience ── */}
          <div className="border-b border-gray-100">
            <SectionHeader
              title="Event Experience" count={activeEventCount}
              editing={addingEvent} collapsed={collapsed.event}
              onToggleCollapse={() => toggle("event")}
              onAdd={() => setAddingEvent(true)} addLabel="Add"
              onCancel={() => { setAddingEvent(false); setEventForm({ eventName: "", roleName: "", startDate: "", endDate: "" }); }}
              onSave={saveEvent}
            />
            {!collapsed.event && (
              <div className="px-5 pb-4 space-y-2">
                {/* Add form */}
                {addingEvent && (
                  <div className="p-3 bg-indigo-50 rounded-xl space-y-2 border border-indigo-100">
                    <div><label className={labelCls}>Event Name</label>
                      <input value={eventForm.eventName} onChange={(e) => setEventForm((f) => ({ ...f, eventName: e.target.value }))} className={inputCls} placeholder="e.g. Summer Spectacular" />
                    </div>
                    <div><label className={labelCls}>Role</label>
                      <input value={eventForm.roleName} onChange={(e) => setEventForm((f) => ({ ...f, roleName: e.target.value }))} className={inputCls} placeholder="e.g. Lead Performer" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className={labelCls}>Start Date</label>
                        <input type="date" value={eventForm.startDate} onChange={(e) => setEventForm((f) => ({ ...f, startDate: e.target.value }))} className={inputCls} />
                      </div>
                      <div><label className={labelCls}>End Date</label>
                        <input type="date" value={eventForm.endDate} onChange={(e) => setEventForm((f) => ({ ...f, endDate: e.target.value }))} className={inputCls} />
                      </div>
                    </div>
                  </div>
                )}
                {eventRecords.length === 0 && !addingEvent && (
                  <p className="text-xs text-gray-300 py-3 text-center">No event records</p>
                )}
                {eventRecords.map((rec) => (
                  <div key={rec.id} className={`p-3 rounded-xl border ${rec.status === "inactive" ? "border-gray-100 opacity-40" : "border-gray-200"}`}>
                    {editingEventId === rec.id ? (
                      <div className="space-y-2">
                        <div><label className={labelCls}>Event Name</label>
                          <input value={editEventForm.eventName} onChange={(e) => setEditEventForm((f) => ({ ...f, eventName: e.target.value }))} className={inputCls} />
                        </div>
                        <div><label className={labelCls}>Role</label>
                          <input value={editEventForm.roleName} onChange={(e) => setEditEventForm((f) => ({ ...f, roleName: e.target.value }))} className={inputCls} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div><label className={labelCls}>Start Date</label>
                            <input type="date" value={editEventForm.startDate} onChange={(e) => setEditEventForm((f) => ({ ...f, startDate: e.target.value }))} className={inputCls} />
                          </div>
                          <div><label className={labelCls}>End Date</label>
                            <input type="date" value={editEventForm.endDate} onChange={(e) => setEditEventForm((f) => ({ ...f, endDate: e.target.value }))} className={inputCls} />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingEventId(null)} className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-gray-600">Cancel</button>
                          <button onClick={() => saveEditEvent(rec.id)} className="text-xs px-2.5 py-1 bg-indigo-500 text-white rounded-lg">Save</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-900 truncate">{rec.eventName}</span>
                            <span className={`flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full font-medium ${rec.status === "active" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                              {rec.status === "active" ? "Active" : "Removed"}
                            </span>
                          </div>
                          <p className="text-xs text-indigo-600 mt-0.5">{rec.roleName}</p>
                          <p className="text-xs text-gray-400 mt-1">{rec.startDate} → {rec.endDate}</p>
                        </div>
                        {rec.status === "active" && (
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => startEditEvent(rec)} className="text-xs text-gray-400 hover:text-gray-700 px-1.5 py-0.5 rounded hover:bg-gray-100 transition-colors">Edit</button>
                            <button onClick={() => setEventRecords((p) => p.map((r) => r.id === rec.id ? { ...r, status: "inactive" } : r))}
                              className="text-xs text-red-400 hover:text-red-600 px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors">Remove</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Attachments ── */}
          <div className="border-b border-gray-100">
            <input ref={attachInputRef} type="file" multiple className="hidden" onChange={handleAttachFile} />
            <SectionHeader
              title="Attachments" count={attachments.length}
              editing={false} collapsed={collapsed.attachments}
              onToggleCollapse={() => toggle("attachments")}
              onAdd={() => attachInputRef.current?.click()} addLabel="Add"
            />
            {!collapsed.attachments && (
              <div className="px-5 pb-4 space-y-2">
                {attachments.length === 0 && (
                  <p className="text-xs text-gray-300 py-3 text-center">No attachments</p>
                )}
                {attachments.map((att) => (
                  <div key={att.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
                    <Paperclip className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-xs text-gray-700 flex-1 truncate">{att.name}</span>
                    <button onClick={() => setAttachments((p) => p.filter((a) => a.id !== att.id))}
                      className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer — just close */}
        <div className="border-t border-gray-100 px-5 py-4 flex-shrink-0">
          <button onClick={onClose} className="w-full py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">Close</button>
        </div>
      </div>
    </>
  );
}

// ── Roster Import Modal ────────────────────────────────────────────────────

function RosterImportModal({ onClose }: { onClose: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<string[][]>([]);

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ["SSO ID", "Full Name", "Nationality", "Height (cm)", "Weight (kg)", "Home Show", "Home Role", "Contract End Date"],
      ["20017233", "Arthur William Bennett", "UK", "178", "72", "UOP", "Dragon Dance", "2025-12-31"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Performers");
    XLSX.writeFile(wb, "performer_import_template.xlsx");
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
      setPreview(rows.slice(0, 6));
    };
    reader.readAsBinaryString(f);
    e.target.value = "";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Import Performers</h2>
            <p className="text-xs text-gray-400 mt-0.5">Upload an Excel file to bulk import performers</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
            <FileSpreadsheet className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-medium text-blue-700">Download template first</p>
              <p className="text-xs text-blue-500 mt-0.5">Fields: SSO ID, Full Name, Nationality, Height, Weight, Home Show, Home Role, Contract End Date</p>
            </div>
            <button onClick={downloadTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors flex-shrink-0">
              <Download className="w-3.5 h-3.5" />Template
            </button>
          </div>

          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
          <div onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl h-24 flex flex-col items-center justify-center gap-2 text-gray-300 hover:border-indigo-300 hover:text-indigo-400 cursor-pointer transition-colors">
            <Upload className="w-6 h-6" />
            <span className="text-sm font-medium">{fileName || "Click to select .xlsx / .xls / .csv"}</span>
          </div>

          {preview.length > 0 && (
            <div className="overflow-auto rounded-xl border border-gray-100">
              <table className="w-full text-xs">
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className={i === 0 ? "bg-gray-50 font-semibold text-gray-700" : "text-gray-600"}>
                      {row.map((cell, j) => (
                        <td key={j} className="px-3 py-2 border-b border-gray-100 whitespace-nowrap">{String(cell ?? "")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length >= 6 && <p className="text-xs text-gray-400 px-3 py-2">Showing first 5 rows…</p>}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 px-6 pb-5">
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={onClose} disabled={!fileName}
            className="px-5 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Import {preview.length > 1 ? `${preview.length - 1} Performers` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Cast Assign Dialog ─────────────────────────────────────────────────────

function CastDialog({ show, role, onClose }: { show: Show; role: Role; onClose: () => void }) {
  const [sso, setSso] = useState("");
  const [type, setType] = useState("home");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Assign Cast</h2>
            <p className="text-xs text-gray-400 mt-0.5">{show.name} / {role.name}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">SSO ID(s)</label>
            <input type="text" value={sso} onChange={(e) => setSso(e.target.value)} placeholder="Enter SSOs, space-separated"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 placeholder:text-gray-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Cast Type</label>
            <div className="flex gap-2">
              {[["home", "Home Cast"], ["swing", "Swing Cast"]].map(([val, lbl]) => (
                <button key={val} onClick={() => setType(val)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${type === val ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 pb-5">
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={onClose} className="px-5 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 transition-colors">Assign</button>
        </div>
      </div>
    </div>
  );
}

// ── Performer Card ─────────────────────────────────────────────────────────

function PerformerCard({ actor, index, type, roleLabel, selected, onSelect }: {
  actor: Actor; index: number; type: "home" | "swing"; roleLabel: string;
  selected?: boolean; onSelect?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && <ActorDetailDrawer actor={actor} roleLabel={roleLabel} onClose={() => setOpen(false)} />}
      <div className={`group relative bg-white rounded-xl overflow-hidden border shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 ${selected ? "border-indigo-400 ring-2 ring-indigo-200" : "border-gray-100"}`}>
        <div className="absolute top-2 left-2 z-10">
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${type === "home" ? "bg-indigo-500 text-white" : "bg-amber-400 text-amber-900"}`}>
            {type === "home" ? `H${index + 1}` : `S${index + 1}`}
          </span>
        </div>
        {onSelect && (
          <button onClick={(e) => { e.stopPropagation(); onSelect(); }}
            className={`absolute top-2 right-2 z-10 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selected ? "bg-indigo-500 border-indigo-500 text-white" : "border-white/70 bg-black/20 text-transparent group-hover:border-white"}`}>
            {selected && <Check className="w-3 h-3" />}
          </button>
        )}
        <div className="relative w-full cursor-pointer" style={{ paddingBottom: "133%" }} onClick={() => setOpen(true)}>
          <img src={actor.photoUrl} alt={actor.name} className="absolute inset-0 w-full h-full object-cover object-top" loading="lazy" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow">
              <Eye className="w-3.5 h-3.5 text-gray-700" />
            </div>
          </div>
        </div>
        <div className="px-2 py-2">
          <p className="text-xs font-bold text-gray-900 leading-snug truncate">{actor.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-400">
            <span>{actor.flag}</span>
            <span>{actor.height}cm</span>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Vacancy Card ───────────────────────────────────────────────────────────

function VacancyCard({ index, onAssign }: { index: number; onAssign: () => void }) {
  return (
    <div onClick={onAssign}
      className="rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/40 transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 text-gray-300 hover:text-indigo-400 aspect-[3/4]">
      <div className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center">
        <Plus className="w-4 h-4" />
      </div>
      <span className="text-xs font-medium">Vacant #{index + 1}</span>
    </div>
  );
}

// ── Card View ──────────────────────────────────────────────────────────────

function CardView({ selectedShow, selectedRole, castTab, setCastTab, onCast, showUnassigned }: {
  selectedShow: Show | null; selectedRole: Role | null;
  castTab: "home" | "swing"; setCastTab: (t: "home" | "swing") => void;
  onCast: () => void; showUnassigned: boolean;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showFilter, setShowFilter] = useState(false);
  const [filterNationality, setFilterNationality] = useState("");
  const [filterHeight, setFilterHeight] = useState("");
  const [showAssignFromFilter, setShowAssignFromFilter] = useState(false);

  function toggleSelect(id: number) {
    setSelectedIds((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  if (showUnassigned) {
    const unassigned = PERFORMERS.filter((p) => !p.homeShow);
    const totalPages = Math.max(1, Math.ceil(unassigned.length / pageSize));
    const safeP = Math.min(page, totalPages);
    const pageItems = unassigned.slice((safeP - 1) * pageSize, safeP * pageSize);
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 pt-5 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Unassigned Performers</h2>
              <p className="text-xs text-gray-400 mt-0.5">{unassigned.length} performers without a home show/role</p>
            </div>
            {selectedIds.size > 0 && (
              <button onClick={onCast}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 transition-colors shadow-sm">
                <Users className="w-4 h-4" />Assign Role ({selectedIds.size})
              </button>
            )}
          </div>
          {unassigned.length === 0 ? (
            <p className="text-sm text-gray-300 py-8 text-center">All performers are assigned</p>
          ) : (
            <div className="grid grid-cols-6 gap-3">
              {pageItems.map((a, i) => (
                <PerformerCard key={a.id} actor={a} index={i} type="home" roleLabel="Unassigned"
                  selected={selectedIds.has(a.id)} onSelect={() => toggleSelect(a.id)} />
              ))}
            </div>
          )}
        </div>
        {totalPages > 1 && (
          <Paginator page={safeP} totalPages={totalPages} pageSize={pageSize} pageSizeOptions={[12, 24, 48]}
            totalItems={unassigned.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
        )}
      </div>
    );
  }

  if (!selectedShow || !selectedRole) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-300">
        <Film className="w-12 h-12" />
        <p className="text-sm">Select a show and role to view the cast</p>
      </div>
    );
  }

  const allActors = castTab === "home" ? selectedRole.homeActors : selectedRole.swingActors;
  const vacancy = castTab === "home" ? Math.max(0, selectedRole.headCount - selectedRole.homeActors.length) : 0;

  const filteredActors = allActors.filter((a) => {
    if (filterNationality && a.nationality !== filterNationality) return false;
    if (filterHeight) {
      if (filterHeight === "lt165" && a.height >= 165) return false;
      if (filterHeight === "165-170" && (a.height < 165 || a.height >= 170)) return false;
      if (filterHeight === "170-175" && (a.height < 170 || a.height >= 175)) return false;
      if (filterHeight === "gt175" && a.height < 175) return false;
    }
    return true;
  });

  const allItems = castTab === "home"
    ? [...filteredActors.map((a, i) => ({ type: "actor" as const, actor: a, index: i })),
       ...Array.from({ length: vacancy }, (_, i) => ({ type: "vacant" as const, vacantIndex: i }))]
    : filteredActors.map((a, i) => ({ type: "actor" as const, actor: a, index: i }));

  const totalItems = allItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeP = Math.min(page, totalPages);
  const pageItems = allItems.slice((safeP - 1) * pageSize, safeP * pageSize);

  const nationalities = [...new Set(allActors.map((a) => a.nationality))].sort();

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 pt-5 pb-4">
          {/* Role header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">{selectedShow.name}</p>
              <h2 className="text-lg font-bold text-gray-900">{selectedRole.name}</h2>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowFilter((p) => !p)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${showFilter ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                <Filter className="w-4 h-4" />Filter
                {(filterNationality || filterHeight) && <span className="w-2 h-2 bg-indigo-500 rounded-full" />}
              </button>
              {selectedIds.size > 0 ? (
                <button onClick={onCast}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 transition-colors shadow-sm">
                  <Users className="w-4 h-4" />Assign ({selectedIds.size})
                </button>
              ) : (
                <button onClick={onCast}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 transition-colors shadow-sm">
                  <Users className="w-4 h-4" />Assign Cast
                </button>
              )}
            </div>
          </div>

          {/* Filter panel */}
          {showFilter && (
            <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3 flex-wrap">
              <select value={filterNationality} onChange={(e) => { setFilterNationality(e.target.value); setPage(1); }}
                className="h-8 px-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 text-gray-700">
                <option value="">All Nationalities</option>
                {nationalities.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <select value={filterHeight} onChange={(e) => { setFilterHeight(e.target.value); setPage(1); }}
                className="h-8 px-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 text-gray-700">
                <option value="">All Heights</option>
                <option value="lt165">&lt; 165 cm</option>
                <option value="165-170">165–170 cm</option>
                <option value="170-175">170–175 cm</option>
                <option value="gt175">&gt; 175 cm</option>
              </select>
              {(filterNationality || filterHeight) && (
                <button onClick={() => { setFilterNationality(""); setFilterHeight(""); setPage(1); }}
                  className="h-8 w-8 flex items-center justify-center border border-gray-200 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
              <span className="text-xs text-gray-400 ml-auto">{filteredActors.length} / {allActors.length} shown</span>
            </div>
          )}

          {/* Headcount stats */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
              <span>编制</span><span className="font-bold text-gray-700">{selectedRole.headCount}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-full">
              <span>在职</span><span className="font-bold">{selectedRole.homeActors.length}</span>
            </div>
            {vacancy > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-red-500 bg-red-50 px-3 py-1.5 rounded-full">
                <span>空缺</span><span className="font-bold">{vacancy}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full">
              <span>Swing</span><span className="font-bold">{selectedRole.swingActors.length}</span>
            </div>
          </div>

          {/* Home / Swing tabs */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl w-fit mb-5">
            {(["home", "swing"] as const).map((t) => {
              const count = t === "home" ? selectedRole.homeActors.length : selectedRole.swingActors.length;
              return (
                <button key={t} onClick={() => { setCastTab(t); setPage(1); setSelectedIds(new Set()); }}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${castTab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                  {t === "home" ? "Home Cast" : "Swing Cast"}
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${castTab === t ? (t === "home" ? "bg-indigo-100 text-indigo-600" : "bg-amber-100 text-amber-700") : "bg-gray-200 text-gray-500"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {totalItems === 0 ? (
            <p className="text-sm text-gray-300 py-8 text-center">No {castTab} cast assigned</p>
          ) : (
            <div className="grid grid-cols-6 gap-3">
              {pageItems.map((item) =>
                item.type === "actor"
                  ? <PerformerCard key={item.actor.id} actor={item.actor} index={item.index} type={castTab}
                      roleLabel={`${selectedShow.name} / ${selectedRole.name}`}
                      selected={selectedIds.has(item.actor.id)}
                      onSelect={() => toggleSelect(item.actor.id)} />
                  : <VacancyCard key={`v-${item.vacantIndex}`} index={item.vacantIndex} onAssign={onCast} />
              )}
            </div>
          )}
        </div>
      </div>
      {totalPages > 1 && (
        <Paginator page={safeP} totalPages={totalPages} pageSize={pageSize} pageSizeOptions={[12, 24, 48]}
          totalItems={totalItems} onPageChange={setPage} onPageSizeChange={setPageSize} />
      )}
    </div>
  );
}

// ── Roster View (List) ─────────────────────────────────────────────────────

type SortKey = "height" | "weight" | "contractEndDate" | null;
type SortDir = "asc" | "desc";

function SortBtn({ col, sortKey, sortDir, onSort }: { col: SortKey; sortKey: SortKey; sortDir: SortDir; onSort: (k: SortKey) => void }) {
  const active = col === sortKey;
  return (
    <button onClick={() => onSort(col)} className="ml-1 inline-flex text-gray-300 hover:text-gray-600 transition-colors">
      {active ? (sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-indigo-500" /> : <ArrowDown className="w-3 h-3 text-indigo-500" />) : <ArrowUpDown className="w-3 h-3" />}
    </button>
  );
}

function RosterView({ onImport }: { onImport: () => void }) {
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [drawerActor, setDrawerActor] = useState<Actor | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [q, setQ] = useState("");
  const [filterShow, setFilterShow] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterSkillType, setFilterSkillType] = useState("");
  const [filterHeight, setFilterHeight] = useState("");
  const [filterEvent, setFilterEvent] = useState("");

  const allShowNames = DATA.flatMap((l) => l.shows).map((s) => s.name);
  const rolesForShow = DATA.flatMap((l) => l.shows).find((s) => s.name === filterShow)?.roles.map((r) => r.name) ?? [];

  function handleSort(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("asc"); }
  }

  function reset() {
    setQ(""); setFilterShow(""); setFilterRole(""); setFilterSkillType("");
    setFilterHeight(""); setFilterEvent(""); setSortKey(null); setPage(1);
  }

  const filtered = useMemo(() => {
    let result = PERFORMERS;
    if (q) { const lq = q.toLowerCase(); result = result.filter((p) => p.name.toLowerCase().includes(lq) || p.ssoId.includes(lq)); }
    if (filterShow) result = result.filter((p) => p.homeShow === filterShow);
    if (filterRole) result = result.filter((p) => p.homeRole === filterRole);
    if (filterSkillType) result = result.filter((p) => p.skillEntries?.some((e) => e.type === filterSkillType));
    if (filterHeight) {
      result = result.filter((p) => {
        if (filterHeight === "lt165") return p.height < 165;
        if (filterHeight === "165-170") return p.height >= 165 && p.height < 170;
        if (filterHeight === "170-175") return p.height >= 170 && p.height < 175;
        if (filterHeight === "gt175") return p.height >= 175;
        return true;
      });
    }
    if (filterEvent === "has") result = result.filter((p) => (p.eventRecords?.filter((e) => e.status === "active").length ?? 0) > 0);
    if (filterEvent === "none") result = result.filter((p) => (p.eventRecords?.filter((e) => e.status === "active").length ?? 0) === 0);
    return result;
  }, [q, filterShow, filterRole, filterSkillType, filterHeight, filterEvent]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = sortKey === "contractEndDate" ? (a.contractEndDate ?? "") : (a[sortKey] ?? 0);
      const bv = sortKey === "contractEndDate" ? (b.contractEndDate ?? "") : (b[sortKey] ?? 0);
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safeP = Math.min(page, totalPages);
  const pageRows = sorted.slice((safeP - 1) * pageSize, safeP * pageSize);
  const hasFilters = !!(q || filterShow || filterRole || filterSkillType || filterHeight || filterEvent);

  return (
    <div className="flex flex-col h-full">
      {drawerActor && (
        <ActorDetailDrawer actor={drawerActor} roleLabel={`${drawerActor.homeShow ?? "—"} / ${drawerActor.homeRole ?? "—"}`}
          onClose={() => setDrawerActor(null)} />
      )}

      {/* Filter bar */}
      <div className="bg-white border-b border-gray-100 px-5 py-2.5 flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="SSO or Name"
            className="h-8 pl-8 pr-3 border border-gray-200 rounded-lg text-xs w-40 focus:outline-none focus:ring-2 focus:ring-indigo-200 placeholder:text-gray-300" />
        </div>
        <select value={filterShow} onChange={(e) => { setFilterShow(e.target.value); setFilterRole(""); setPage(1); }}
          className="h-8 px-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 text-gray-700 w-28">
          <option value="">All Shows</option>
          {allShowNames.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <select value={filterRole} onChange={(e) => { setFilterRole(e.target.value); setPage(1); }} disabled={!filterShow}
          className="h-8 px-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 text-gray-700 w-36 disabled:opacity-40">
          <option value="">All Roles</option>
          {rolesForShow.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <select value={filterSkillType} onChange={(e) => { setFilterSkillType(e.target.value); setPage(1); }}
          className="h-8 px-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 text-gray-700 w-28">
          <option value="">All Skills</option>
          {SKILLSET_CATEGORIES.map((c) => <option key={c.type} value={c.type}>{c.type}</option>)}
        </select>
        <select value={filterHeight} onChange={(e) => { setFilterHeight(e.target.value); setPage(1); }}
          className="h-8 px-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 text-gray-700 w-32">
          <option value="">All Heights</option>
          <option value="lt165">&lt; 165 cm</option>
          <option value="165-170">165 – 170 cm</option>
          <option value="170-175">170 – 175 cm</option>
          <option value="gt175">&gt; 175 cm</option>
        </select>
        <select value={filterEvent} onChange={(e) => { setFilterEvent(e.target.value); setPage(1); }}
          className="h-8 px-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 text-gray-700 w-36">
          <option value="">All Experience</option>
          <option value="has">Has Event Exp.</option>
          <option value="none">No Event Exp.</option>
        </select>
        {hasFilters && (
          <button onClick={reset} className="h-8 w-8 flex items-center justify-center border border-gray-200 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
        <span className="text-xs text-gray-400 ml-auto">{sorted.length} performers</span>
        <button onClick={onImport} className="h-8 flex items-center gap-1.5 px-3 bg-indigo-500 text-white rounded-lg text-xs font-medium hover:bg-indigo-600 transition-colors">
          <Upload className="w-3.5 h-3.5" />Import
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
              <th className="w-12 px-4 py-3" />
              <th className="text-left px-4 py-3 font-semibold">Full Name</th>
              <th className="text-left px-4 py-3 font-semibold">SSO</th>
              <th className="text-left px-4 py-3 font-semibold">Nationality</th>
              <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">
                Height <SortBtn col="height" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              </th>
              <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">
                Weight <SortBtn col="weight" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              </th>
              <th className="text-left px-4 py-3 font-semibold">Skillset</th>
              <th className="text-left px-4 py-3 font-semibold">Show / Role</th>
              <th className="text-left px-4 py-3 font-semibold">Event Exp.</th>
              <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">
                Contract End <SortBtn col="contractEndDate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              </th>
              <th className="text-left px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-50">
            {pageRows.length === 0 && (
              <tr><td colSpan={11} className="text-center py-16 text-gray-300 text-sm">No performers found</td></tr>
            )}
            {pageRows.map((p) => {
              const evCount = p.eventRecords?.filter((e) => e.status === "active").length ?? 0;
              return (
                <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-4 py-3">
                    <img src={p.photoUrl} alt={p.name} className="w-9 h-9 rounded-full object-cover object-top ring-2 ring-white shadow-sm" />
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{p.name}</td>
                  <td className="px-4 py-3 font-mono text-gray-500 text-xs">{p.ssoId}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.flag} {p.nationality}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.height} cm</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.weight} kg</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 max-w-[180px]">
                      {(p.skillEntries ?? []).slice(0, 3).map((e) => (
                        <span key={e.id} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${SKILL_TAG_COLORS[e.type] ?? "bg-gray-100 text-gray-600"}`}>
                          {e.skill}
                        </span>
                      ))}
                      {(p.skillEntries?.length ?? 0) > 3 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 font-medium">+{(p.skillEntries?.length ?? 0) - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {p.homeShow ? <><span className="font-medium text-indigo-600">{p.homeShow}</span> / {p.homeRole}</> : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {evCount > 0
                      ? <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded-full font-medium">{evCount} events</span>
                      : <span className="text-xs text-gray-300">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{p.contractEndDate ?? "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button onClick={() => setDrawerActor(p)} className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors">View</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Paginator page={safeP} totalPages={totalPages} pageSize={pageSize} pageSizeOptions={[10, 20, 50]}
        totalItems={sorted.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
    </div>
  );
}

// ── Export Report ──────────────────────────────────────────────────────────

function exportReport() {
  const rows: (string | number)[][] = [
    ["Show Name", "Role Name", "Headcount", "Incumbent", "Vacancy", "Swing Role Count"],
  ];
  DATA.forEach((land) => {
    land.shows.forEach((show) => {
      show.roles.forEach((role) => {
        const incumbent = role.homeActors.length;
        const vacancy = Math.max(0, role.headCount - incumbent);
        rows.push([show.name, role.name, role.headCount, incumbent, vacancy, role.swingActors.length]);
      });
    });
  });
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 14 }, { wch: 24 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 18 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Casting Report");
  XLSX.writeFile(wb, "casting_book_report.xlsx");
}

// ── Main Page ──────────────────────────────────────────────────────────────

type ViewMode = "card" | "roster";

export default function CastingBookPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [selectedLandId, setSelectedLandId] = useState(DATA[0].id);
  const [selectedShowId, setSelectedShowId] = useState<string>(DATA[0].shows[0].id);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [castTab, setCastTab] = useState<"home" | "swing">("home");
  const [showCastDialog, setShowCastDialog] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const land = useMemo(() => DATA.find((l) => l.id === selectedLandId) ?? DATA[0], [selectedLandId]);
  const selectedShow = useMemo(() => land.shows.find((s) => s.id === selectedShowId) ?? null, [land, selectedShowId]);
  const selectedRole = useMemo(() => selectedRoleId ? selectedShow?.roles.find((r) => r.id === selectedRoleId) ?? null : null, [selectedShow, selectedRoleId]);

  function selectShow(showId: string) { setSelectedShowId(showId); setSelectedRoleId(null); setCastTab("home"); setShowUnassigned(false); }
  function selectRole(roleId: string) { setSelectedRoleId(roleId); setCastTab("home"); setShowUnassigned(false); }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 flex-shrink-0 h-14 px-5 flex items-center justify-between z-30">
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-5 h-5 text-indigo-500" />
          <span className="font-bold text-gray-900 text-base">Casting Book</span>
        </div>

        <div className="flex items-center gap-1 ml-6">
          {DATA.map((l) => (
            <button key={l.id} onClick={() => { setSelectedLandId(l.id); setSelectedShowId(l.shows[0].id); setSelectedRoleId(null); setShowUnassigned(false); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedLandId === l.id ? "bg-indigo-50 text-indigo-700" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}>
              {l.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={exportReport}
            className="flex items-center gap-1.5 h-8 px-3 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors">
            <Download className="w-3.5 h-3.5" />Export Report
          </button>
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
            {([
              ["card", "View by Card", LayoutGrid],
              ["roster", "View by Roster", List],
            ] as [ViewMode, string, React.ElementType][]).map(([mode, label, Icon]) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === mode ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Show & Role nav (card mode only) */}
      {viewMode === "card" && (
        <div className="bg-white border-b border-gray-100 flex-shrink-0">
          <div className="px-5 pt-3 flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {land.shows.map((show) => {
              const active = show.id === selectedShowId && !showUnassigned;
              const home = show.roles.reduce((s, r) => s + r.homeActors.length, 0);
              return (
                <button key={show.id} onClick={() => selectShow(show.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-t-xl text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${active ? "border-indigo-500 text-indigo-700 bg-indigo-50/50" : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}>
                  {show.name}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${active ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-500"}`}>{home}</span>
                </button>
              );
            })}
            {/* Unassigned tab */}
            <button onClick={() => { setShowUnassigned(true); setSelectedRoleId(null); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-t-xl text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${showUnassigned ? "border-orange-400 text-orange-600 bg-orange-50/50" : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}>
              Unassigned
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${showUnassigned ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-500"}`}>
                {PERFORMERS.filter((p) => !p.homeShow).length}
              </span>
            </button>
          </div>

          {selectedShow && !showUnassigned && (
            <div className="px-5 pb-3 pt-2 flex items-center gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {selectedShow.roles.map((role) => {
                const active = selectedRoleId === role.id;
                const vacancy = Math.max(0, role.headCount - role.homeActors.length);
                return (
                  <button key={role.id} onClick={() => selectRole(role.id)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${active ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    {role.name}
                    <span className={`text-xs ${active ? "text-indigo-200" : "text-gray-400"}`}>{role.homeActors.length}/{role.headCount}</span>
                    {vacancy > 0 && (
                      <span className={`text-xs font-bold px-1 rounded ${active ? "bg-white/20 text-white" : "bg-red-100 text-red-500"}`}>-{vacancy}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {viewMode === "card" && (
          <CardView selectedShow={selectedShow} selectedRole={selectedRole}
            castTab={castTab} setCastTab={setCastTab}
            onCast={() => setShowCastDialog(true)}
            showUnassigned={showUnassigned} />
        )}
        {viewMode === "roster" && <RosterView onImport={() => setShowImportModal(true)} />}
      </div>

      {showCastDialog && selectedShow && selectedRole && (
        <CastDialog show={selectedShow} role={selectedRole} onClose={() => setShowCastDialog(false)} />
      )}
      {showImportModal && <RosterImportModal onClose={() => setShowImportModal(false)} />}
    </div>
  );
}
