/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useMemo, useRef } from "react";
import {
  BookOpen, X, Pencil, Upload, Play, ChevronDown, ChevronUp,
  ArrowUp, ArrowDown, ArrowUpDown, LayoutGrid, List,
  RotateCcw, Eye, Users, Film, Plus, Paperclip,
  ChevronLeft, ChevronRight, Camera, Download, FileSpreadsheet,
  Filter, Check, Menu,
} from "lucide-react";
import * as XLSX from "xlsx";

// ── Types ──────────────────────────────────────────────────────────────────

interface MediaFile { type: "photo" | "video"; url: string; duration?: string; note?: string }
interface SkillEntry { id: string; type: string; skill: string }
interface ShowRoleRecord {
  id: string; show: string; role: string; roleType: "home" | "swing";
  date: string; status: "active" | "inactive";
}
interface EventRecord { id: string; eventName: string; roleName: string; startDate: string; endDate: string; status: "active" | "inactive" }

// Measurement: each numeric field stores TM (Talent Manager) and Costuming dual values
type MeasNum = { tm: number | ""; costuming: number | "" };
type MeasStr = { tm: string; costuming: string };
interface Measurements {
  height: MeasNum; weight: MeasNum; braSize: MeasStr;
  neck: MeasNum; sneakerSize: MeasNum; headCircumference: MeasNum;
  acrossShoulderBack: MeasNum; acrossFront: MeasNum; acrossBack: MeasNum;
  chest: MeasNum; waist: MeasNum; hips: MeasNum;
  bicep: MeasNum; wrist: MeasNum;
  updateInfo: { date: string; editor: string; ssoId: string };
}

interface Attachment { id: string; name: string; fileType: string }

interface Actor {
  id: number; ssoId: string; name: string; nationality: string; flag: string;
  gender?: "men" | "women";
  employeeClass?: string;
  idPassportEndDate?: string;
  height: number; weight: number; photoUrl: string;
  homeShow?: string; homeRole?: string;
  offerShow?: string; offerRole?: string;
  contractStartDate?: string; contractEndDate?: string;
  skillEntries?: SkillEntry[];
  mediaFiles?: MediaFile[]; showRoleRecords?: ShowRoleRecord[]; eventRecords?: EventRecord[];
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
const ATTACHMENT_NAMES = ["Resume_2024.pdf", "Headshot_2023.pdf", "Demo_Reel.mp4", "Contract.pdf", "Portfolio.pdf"];
const MEDIA_NOTES = ["Front pose, natural lighting", "Character makeup rehearsal", "Training reel clip", "Stage performance", "", "", "Showcase 2024", ""];

function dHash(n: number): number {
  let x = n ^ (n >>> 16);
  x = Math.imul(x, 0x45d9f3b);
  x = x ^ (x >>> 16);
  return Math.abs(x);
}

const MEAS_EDITORS = [
  { name: "James Li Xiao", sso: "20099999" },
  { name: "Sarah Chen", sso: "20088888" },
  { name: "Marcus Wong", sso: "20077777" },
];

function genMeasurements(seed: number, height: number, weight: number): Measurements {
  const h = dHash(seed * 23);
  const pair = (base: number, range: number, diff: number): MeasNum => ({
    tm: base + (h % range),
    costuming: base + (h % range) + (dHash(seed + diff) % 3) - 1,
  });
  const ed = MEAS_EDITORS[h % MEAS_EDITORS.length];
  const upDate = new Date(Date.now() - ((h % 240) + 30) * 86400000).toISOString().split("T")[0];
  return {
    height: { tm: height, costuming: height - (dHash(seed * 3) % 2) },
    weight: { tm: weight, costuming: weight + (dHash(seed * 5) % 2) },
    braSize: {
      tm: `${28 + (h % 12)}${["A", "B", "C", "D", "DD"][dHash(seed * 31) % 5]}`,
      costuming: `${8 + (h % 10)}${["A", "B", "C", "D"][dHash(seed * 29) % 4]}`,
    },
    neck: pair(32, 8, 1),
    sneakerSize: pair(35, 12, 2),
    headCircumference: pair(54, 8, 3),
    acrossShoulderBack: pair(38, 8, 4),
    acrossFront: pair(38, 12, 5),
    acrossBack: pair(38, 12, 6),
    chest: pair(78, 22, 7),
    waist: pair(58, 22, 8),
    hips: pair(82, 18, 9),
    bicep: pair(28, 10, 10),
    wrist: pair(15, 6, 11),
    updateInfo: { date: upDate, editor: ed.name, ssoId: ed.sso },
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
      gender: pool.gender,
      height, weight,
      photoUrl: `https://randomuser.me/api/portraits/${pool.gender}/${photoNum}.jpg`,
      skillEntries: genSkillEntries(seed * 100 + i),
      measurements: genMeasurements(seed * 100 + i, height, weight),
      attachments: genAttachments(seed * 100 + i),
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

const EMPLOYEE_CLASSES = ["Foreign Foreign", "Local", "Foreign Local", "Mainland"];

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
  const contractEndDate = CONTRACT_DATES[dHash(seed * 3) % CONTRACT_DATES.length];
  const contractStartDate = CONTRACT_DATES[dHash(seed * 47) % CONTRACT_DATES.length];
  const offerPair = SHOW_ROLE_PAIRS[dHash(seed * 53) % SHOW_ROLE_PAIRS.length];
  return {
    id: 9000 + seed, ssoId: `2001${String(7000 + dHash(seed * 19) % 3000)}`,
    name: pool.name, nationality: pool.nationality, flag: pool.flag,
    gender: pool.gender,
    employeeClass: EMPLOYEE_CLASSES[dHash(seed * 41) % EMPLOYEE_CLASSES.length],
    idPassportEndDate: CONTRACT_DATES[dHash(seed * 43) % CONTRACT_DATES.length],
    height, weight,
    photoUrl: `https://randomuser.me/api/portraits/${pool.gender}/${photoNum}.jpg`,
    homeShow: pair.show, homeRole: pair.role,
    offerShow: offerPair.show, offerRole: offerPair.role,
    contractStartDate, contractEndDate,
    skillEntries: genSkillEntries(seed),
    mediaFiles,
    showRoleRecords: genShowRoleRecords(seed, pair.show, pair.role, contractEndDate),
    eventRecords: genEventRecords(seed),
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
            className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium px-2 py-1 rounded hover:bg-brand-50 transition-colors">
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

type DateOp = "lt" | "gt" | "between";
interface DateRange { op: DateOp; v1: string; v2: string }

interface Filters {
  performer: string;
  employeeClass: string;
  heightMin: string; heightMax: string;
  weightMin: string; weightMax: string;
  gender: string;
  skillType: string; skillSub: string;
  offerShow: string; offerRole: string;
  homeShow: string; homeRole: string;
  swingShow: string; swingRole: string;
  eventName: string; eventRoleName: string;
  contractEnd: DateRange;
  idPassportEnd: DateRange;
  nationality: string;
}

const EMPTY_DATE: DateRange = { op: "lt", v1: "", v2: "" };
const EMPTY_FILTERS: Filters = {
  performer: "", employeeClass: "",
  heightMin: "", heightMax: "", weightMin: "", weightMax: "",
  gender: "", skillType: "", skillSub: "",
  offerShow: "", offerRole: "", homeShow: "", homeRole: "", swingShow: "", swingRole: "",
  eventName: "", eventRoleName: "",
  contractEnd: { ...EMPTY_DATE }, idPassportEnd: { ...EMPTY_DATE },
  nationality: "",
};

function dateRangeActive(d: DateRange): boolean {
  if (d.op === "between") return !!d.v1 && !!d.v2;
  return !!d.v1;
}

function dateRangeMatches(d: DateRange, value: string | undefined): boolean {
  if (!value) return false;
  if (d.op === "lt") return value < d.v1;
  if (d.op === "gt") return value > d.v1;
  return value >= d.v1 && value <= d.v2;
}

function hasAnyFilter(f: Filters): boolean {
  return Object.entries(f).some(([k, v]) => {
    if (k === "contractEnd" || k === "idPassportEnd") return dateRangeActive(v as DateRange);
    return v !== "";
  });
}

function actorMatchesFilters(a: Actor, f: Filters): boolean {
  if (f.performer) {
    const lq = f.performer.toLowerCase();
    if (!a.name.toLowerCase().includes(lq) && !a.ssoId.includes(lq)) return false;
  }
  if (f.employeeClass && a.employeeClass !== f.employeeClass) return false;
  if (f.heightMin && a.height < +f.heightMin) return false;
  if (f.heightMax && a.height > +f.heightMax) return false;
  if (f.weightMin && a.weight < +f.weightMin) return false;
  if (f.weightMax && a.weight > +f.weightMax) return false;
  if (f.gender) {
    const g = f.gender === "Male" ? "men" : f.gender === "Female" ? "women" : "";
    if (g && a.gender !== g) return false;
  }
  if (f.skillType && !a.skillEntries?.some((e) => e.type === f.skillType && (!f.skillSub || e.skill === f.skillSub))) return false;
  if (f.offerShow && a.offerShow !== f.offerShow) return false;
  if (f.offerRole && a.offerRole !== f.offerRole) return false;
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
  if (dateRangeActive(f.contractEnd) && !dateRangeMatches(f.contractEnd, a.contractEndDate)) return false;
  if (dateRangeActive(f.idPassportEnd) && !dateRangeMatches(f.idPassportEnd, a.idPassportEndDate)) return false;
  if (f.nationality && a.nationality !== f.nationality) return false;
  return true;
}

const ALL_SHOWS = DATA.flatMap((l) => l.shows);
const ALL_NATIONALITIES = [...new Set(ACTOR_POOL.map((a) => a.nationality))].sort();
const EMPLOYEE_CLASS_OPTS = ["Local", "Foreign Local", "Foreign Foreign", "Mainland"];

type StringFilterKey = {
  [K in keyof Filters]: Filters[K] extends string ? K : never
}[keyof Filters];
type DateFilterKey = {
  [K in keyof Filters]: Filters[K] extends DateRange ? K : never
}[keyof Filters];

function FilterPanel({ filters, onChange, onClose }: {
  filters: Filters; onChange: (next: Filters) => void; onClose: () => void;
}) {
  const set = (k: StringFilterKey, v: string) => onChange({ ...filters, [k]: v });
  const setDate = (k: DateFilterKey, next: DateRange) => onChange({ ...filters, [k]: next });
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

  const renderDateRange = (key: DateFilterKey, label: string) => {
    const d = filters[key];
    const cols = d.op === "between" ? "grid-cols-[110px_1fr_1fr]" : "grid-cols-[110px_1fr]";
    return (
      <div className="sm:col-span-2">
        <label className={lblCls}>{label}</label>
        <div className={`grid gap-1.5 ${cols}`}>
          <select value={d.op}
            onChange={(e) => setDate(key, { ...d, op: e.target.value as DateOp })}
            className={fieldCls}>
            <option value="lt">Earlier than</option>
            <option value="gt">Later than</option>
            <option value="between">Between</option>
          </select>
          <input type="date" value={d.v1}
            onChange={(e) => setDate(key, { ...d, v1: e.target.value })}
            className={fieldCls} />
          {d.op === "between" && (
            <input type="date" value={d.v2}
              onChange={(e) => setDate(key, { ...d, v2: e.target.value })}
              className={fieldCls} />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-sm mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <div>
          <label className={lblCls}>Performer</label>
          <input value={filters.performer} onChange={(e) => set("performer", e.target.value)} placeholder="请输入SSO/姓名" className={fieldCls} />
        </div>
        <div>
          <label className={lblCls}>Employee Class</label>
          <select value={filters.employeeClass} onChange={(e) => set("employeeClass", e.target.value)} className={fieldCls}>
            <option value="">请选择</option>
            {EMPLOYEE_CLASS_OPTS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
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
        {renderShowRolePair("offerShow", "offerRole", "Offer Show & Role")}
        {renderShowRolePair("homeShow", "homeRole", "Current Home Show & Role")}
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
        {renderDateRange("contractEnd", "Contract End Date")}
        {renderDateRange("idPassportEnd", "ID/Passport Valid End Date")}
        <div>
          <label className={lblCls}>Nationality</label>
          <select value={filters.nationality} onChange={(e) => set("nationality", e.target.value)} className={fieldCls}>
            <option value="">请选择</option>
            {ALL_NATIONALITIES.map((n) => <option key={n} value={n}>{n}</option>)}
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

// ── Measurement Section ────────────────────────────────────────────────────

const MEAS_GROUPS: { col: ("left" | "mid" | "right"); label: string; key: keyof Measurements; kind: "num" | "str" }[] = [
  // Left column
  { col: "left", label: "Height 身高(cm)", key: "height", kind: "num" },
  { col: "left", label: "Neck 领围(cm)", key: "neck", kind: "num" },
  { col: "left", label: "Across Shoulder Back 后肩宽(cm)", key: "acrossShoulderBack", kind: "num" },
  { col: "left", label: "Chest 胸围(cm)", key: "chest", kind: "num" },
  { col: "left", label: "Bicep 大臂围(cm)", key: "bicep", kind: "num" },
  // Mid column
  { col: "mid", label: "Weight 体重(kg)", key: "weight", kind: "num" },
  { col: "mid", label: "Sneaker Size 运动鞋尺码", key: "sneakerSize", kind: "num" },
  { col: "mid", label: "Across Front 前胸宽(cm)", key: "acrossFront", kind: "num" },
  { col: "mid", label: "Waist 腰围(cm)", key: "waist", kind: "num" },
  { col: "mid", label: "Wrist 手腕(cm)", key: "wrist", kind: "num" },
  // Right column
  { col: "right", label: "Bra Size 胸罩罩杯", key: "braSize", kind: "str" },
  { col: "right", label: "Head Circumference 头围(cm)", key: "headCircumference", kind: "num" },
  { col: "right", label: "Across Back 后背宽(cm)", key: "acrossBack", kind: "num" },
  { col: "right", label: "Hips 臀围(cm)", key: "hips", kind: "num" },
];

function MeasurementSection({ meas, measDraft, setMeasDraft, editing, collapsed, onToggleCollapse, onEdit, onSave, onCancel, onUpload }: {
  meas: Measurements; measDraft: Measurements; setMeasDraft: (m: Measurements) => void;
  editing: boolean; collapsed: boolean;
  onToggleCollapse: () => void; onEdit: () => void; onSave: () => void; onCancel: () => void;
  onUpload: () => void;
}) {
  const cols: Record<"left" | "mid" | "right", typeof MEAS_GROUPS> = { left: [], mid: [], right: [] };
  MEAS_GROUPS.forEach((g) => cols[g.col].push(g));

  // Use the "costuming" slot as the canonical (and only) value going forward.
  function renderCell(group: typeof MEAS_GROUPS[number]) {
    const src = editing ? measDraft : meas;
    const field = src[group.key] as MeasNum | MeasStr;
    if (editing) {
      const update = (val: string) => {
        const next = { ...measDraft };
        const cur = next[group.key] as MeasNum | MeasStr;
        if (group.kind === "num") {
          (next[group.key] as MeasNum) = { ...(cur as MeasNum), costuming: val === "" ? "" : +val };
        } else {
          (next[group.key] as MeasStr) = { ...(cur as MeasStr), costuming: val };
        }
        setMeasDraft(next);
      };
      return (
        <div className="grid grid-cols-[1fr_72px] items-center gap-1.5 py-1">
          <span className="text-[10.5px] text-gray-500 leading-tight">{group.label}</span>
          <input
            type={group.kind === "num" ? "number" : "text"}
            value={String(field.costuming ?? "")}
            onChange={(e) => update(e.target.value)}
            className="h-7 px-1.5 border border-gray-200 rounded text-[11px] text-center focus:outline-none focus:ring-1 focus:ring-brand-300" />
        </div>
      );
    }
    return (
      <div className="grid grid-cols-[1fr_72px] items-center gap-1.5 py-1.5">
        <span className="text-[10.5px] text-gray-500 leading-tight">{group.label}</span>
        <span className="text-[11px] font-semibold text-gray-900 text-center">{field.costuming === "" ? "—" : field.costuming}</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggleCollapse}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">Measurement</span>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {!editing && !collapsed && (
            <>
              <span className="text-[10px] text-gray-400">
                Update Info: <span className="text-gray-600">{meas.updateInfo.date || "—"}</span>
              </span>
              <button onClick={onUpload}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium px-2 py-1 rounded hover:bg-gray-100 transition-colors">
                <Upload className="w-3 h-3" />Upload
              </button>
              <button onClick={onEdit}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium px-2 py-1 rounded hover:bg-gray-100 transition-colors">
                <Pencil className="w-3 h-3" />Edit
              </button>
            </>
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
      {!collapsed && (
        <div className="px-4 sm:px-5 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 divide-x-0">
            {(["left", "mid", "right"] as const).map((c) => (
              <div key={c} className="divide-y divide-gray-50">
                {cols[c].map((g) => <div key={g.key as string}>{renderCell(g)}</div>)}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ── Measurement Import Modal ───────────────────────────────────────────────

function MeasurementImportModal({ onClose, onApply, ssoId }: {
  onClose: () => void;
  onApply: (next: Partial<Measurements>) => void;
  ssoId: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<string[][]>([]);

  function downloadTemplate() {
    const header = ["SSO", ...MEAS_GROUPS.map((g) => g.label)];
    const sample = [ssoId, ...MEAS_GROUPS.map(() => "")];
    const ws = XLSX.utils.aoa_to_sheet([header, sample]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Measurement");
    XLSX.writeFile(wb, `measurement_template_${ssoId}.xlsx`);
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

  function applyImport() {
    if (preview.length < 2) { onClose(); return; }
    const dataRow = preview[1];
    // dataRow[0] = SSO, dataRow[1..] = values aligned to MEAS_GROUPS
    const next: Partial<Measurements> = {};
    MEAS_GROUPS.forEach((g, i) => {
      const raw = String(dataRow[i + 1] ?? "").trim();
      if (!raw) return;
      if (g.kind === "num") {
        const v = Number(raw);
        if (!Number.isNaN(v)) (next[g.key] as MeasNum) = { tm: v, costuming: v };
      } else {
        (next[g.key] as MeasStr) = { tm: raw, costuming: raw };
      }
    });
    onApply(next);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[92vw] max-w-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Upload Measurement</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-5 sm:px-6 py-4 sm:py-5 space-y-4 overflow-y-auto">
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
            <FileSpreadsheet className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-blue-700">Download template first</p>
              <p className="text-xs text-blue-500 mt-0.5">Includes all measurement fields plus SSO.</p>
            </div>
            <button onClick={downloadTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors flex-shrink-0">
              <Download className="w-3.5 h-3.5" />Template
            </button>
          </div>

          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
          <div onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl h-24 flex flex-col items-center justify-center gap-2 text-gray-300 hover:border-brand-300 hover:text-brand-400 cursor-pointer transition-colors">
            <Upload className="w-6 h-6" />
            <span className="text-sm font-medium px-2 text-center">{fileName || "Click to select .xlsx / .xls / .csv"}</span>
          </div>

          {preview.length > 0 && (
            <div className="overflow-auto rounded-xl border border-gray-100 max-h-72">
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
            </div>
          )}
        </div>
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 px-5 sm:px-6 pb-5 pt-3 border-t border-gray-50 sm:border-t-0">
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={applyImport} disabled={preview.length < 2}
            className="px-5 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Apply
          </button>
        </div>
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
  const [showMore, setShowMore] = useState(false);
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

  // ── Portfolio section ──────────────────────────────────────────────────
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>(actor.mediaFiles ?? []);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [addingMedia, setAddingMedia] = useState(false);
  const [mediaForm, setMediaForm] = useState<{ note: string; file: File | null; url: string; type: "photo" | "video" }>({
    note: "", file: null, url: "", type: "photo",
  });
  const portfolioInputRef = useRef<HTMLInputElement>(null);

  function handlePortfolioPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    const type: "photo" | "video" = f.type.startsWith("video") ? "video" : "photo";
    setMediaForm((p) => ({ ...p, file: f, url, type }));
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
  const initialShowRoleRecords: ShowRoleRecord[] = actor.showRoleRecords
    ?? (actor.homeShow && actor.homeRole
      ? [{ id: `sr-${actor.id}-home`, show: actor.homeShow, role: actor.homeRole, roleType: "home", date: actor.contractEndDate ?? "—", status: "active" }]
      : []);
  const [showRoleRecords, setShowRoleRecords] = useState<ShowRoleRecord[]>(initialShowRoleRecords);
  const [addingShowRole, setAddingShowRole] = useState(false);
  const [showRoleForm, setShowRoleForm] = useState<{ show: string; role: string; roleType: "home" | "swing" }>({ show: "", role: "", roleType: "home" });

  const rolesForFormShow = DATA.flatMap((l) => l.shows).find((s) => s.name === showRoleForm.show)?.roles ?? [];

  function saveShowRole() {
    if (!showRoleForm.show || !showRoleForm.role) return;
    setShowRoleRecords((p) => [
      { id: `sr-${Date.now()}`, show: showRoleForm.show, role: showRoleForm.role, roleType: showRoleForm.roleType, date: new Date().toISOString().split("T")[0], status: "active" },
      ...p,
    ]);
    setShowRoleForm({ show: "", role: "", roleType: "home" });
    setAddingShowRole(false);
  }

  // ── Measurements section ───────────────────────────────────────────────
  const fallbackMeas: Measurements = {
    height: { tm: actor.height, costuming: actor.height },
    weight: { tm: actor.weight, costuming: actor.weight },
    braSize: { tm: "", costuming: "" },
    neck: { tm: "", costuming: "" }, sneakerSize: { tm: "", costuming: "" }, headCircumference: { tm: "", costuming: "" },
    acrossShoulderBack: { tm: "", costuming: "" }, acrossFront: { tm: "", costuming: "" }, acrossBack: { tm: "", costuming: "" },
    chest: { tm: "", costuming: "" }, waist: { tm: "", costuming: "" }, hips: { tm: "", costuming: "" },
    bicep: { tm: "", costuming: "" }, wrist: { tm: "", costuming: "" },
    updateInfo: { date: "", editor: "—", ssoId: "" },
  };
  const [meas, setMeas] = useState<Measurements>(actor.measurements ?? fallbackMeas);
  const [editingMeas, setEditingMeas] = useState(false);
  const [measDraft, setMeasDraft] = useState<Measurements>(meas);

  function saveMeas() {
    const today = new Date().toISOString().split("T")[0];
    const next: Measurements = {
      ...measDraft,
      updateInfo: { date: today, editor: "Current Casting", ssoId: "30099999" },
    };
    setMeas(next);
    setEditingMeas(false);
  }

  const [measImportOpen, setMeasImportOpen] = useState(false);

  function applyMeasurementImport(next: Partial<Measurements>) {
    const today = new Date().toISOString().split("T")[0];
    setMeas((prev) => ({
      ...prev,
      ...next,
      updateInfo: { date: today, editor: "Imported", ssoId: "" },
    }));
  }

  // ── Event Experience section ───────────────────────────────────────────
  const [eventRecords, setEventRecords] = useState<EventRecord[]>(actor.eventRecords ?? []);
  const [addingEvent, setAddingEvent] = useState(false);
  const [eventForm, setEventForm] = useState({ eventName: "", roleName: "", startDate: "", endDate: "" });
  const eventRolesForForm = rolesForEvent(eventForm.eventName);

  function saveEvent() {
    if (!eventForm.eventName || !eventForm.roleName || !eventForm.startDate) return;
    setEventRecords((p) => [{ id: `ev-${Date.now()}`, ...eventForm, status: "active" }, ...p]);
    setEventForm({ eventName: "", roleName: "", startDate: "", endDate: "" });
    setAddingEvent(false);
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

  const inputCls = "w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300";
  const labelCls = "block text-xs text-gray-400 mb-1";

  const activeShowRoleCount = showRoleRecords.filter((r) => r.status === "active").length;
  const activeEventCount = eventRecords.filter((r) => r.status === "active").length;

  return (
    <>
      {lightboxIdx !== null && (
        <Lightbox files={mediaFiles} initialIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
      {measImportOpen && (
        <MeasurementImportModal ssoId={actor.ssoId}
          onApply={applyMeasurementImport}
          onClose={() => setMeasImportOpen(false)} />
      )}
      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          onCancel={() => setConfirm(null)}
          onConfirm={() => { confirm.onConfirm(); setConfirm(null); }}
        />
      )}
      <input ref={headshotInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setHeadshotUrl(URL.createObjectURL(f));
          e.target.value = "";
        }} />
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-[528px] bg-white shadow-2xl flex flex-col">

        {/* Photo header with headshot replacement */}
        <div className="relative flex-shrink-0 h-40 sm:h-48 bg-gray-100 group/headshot">
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

        {/* Home Show & Role accent strip */}
        {(actor.homeShow || actor.homeRole) && (
          <div className="flex-shrink-0 px-5 py-2.5 bg-brand-50 border-b border-brand-100 flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wide text-brand-600 font-semibold">Home Show & Role</span>
            <span className="text-sm font-bold text-brand-700">
              {actor.homeShow ?? "—"} <span className="text-brand-400 mx-1">&</span> {actor.homeRole ?? "—"}
            </span>
          </div>
        )}

        {/* Basic Info — top row */}
        <div className="flex-shrink-0 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 border-b border-gray-100">
          {[
            { label: "SSO", value: actor.ssoId, mono: true },
            { label: "Nationality", value: `${actor.flag} ${actor.nationality}` },
            { label: "Height", value: `${actor.height} cm` },
            { label: "Weight", value: `${actor.weight} kg` },
            { label: "Contract End", value: actor.contractEndDate ?? "—" },
          ].map(({ label, value, mono }) => (
            <div key={label} className="px-2 py-2.5 text-center border-r border-b border-gray-100 last:border-r-0 sm:[&:nth-child(3n)]:border-r-0 md:[&:nth-child(3n)]:border-r md:[&:nth-child(5n)]:border-r-0">
              <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
              <p className={`text-[11px] font-semibold text-gray-800 leading-snug truncate ${mono ? "font-mono" : ""}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Basic Info — More expander */}
        <div className="flex-shrink-0 border-b border-gray-100">
          <button onClick={() => setShowMore((p) => !p)}
            className="w-full flex items-center justify-center gap-1 py-1.5 text-[11px] text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors">
            {showMore ? "Less" : "More"}
            {showMore ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showMore && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 px-5 pb-3 text-[11px]">
              {[
                ["Gender", actor.gender === "men" ? "Male" : actor.gender === "women" ? "Female" : ""],
                ["Employee Class", actor.employeeClass],
                ["Offer Show", actor.offerShow],
                ["Offer Role", actor.offerRole],
                ["Contract Start Date", actor.contractStartDate],
                ["Contract End Date", actor.contractEndDate],
                ["ID/Passport Valid End Date", actor.idPassportEndDate],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-2 border-b border-gray-50 last:border-b-0 pb-1">
                  <span className="text-gray-400 flex-shrink-0">{label}</span>
                  <span className="text-gray-800 font-medium truncate">{value || "—"}</span>
                </div>
              ))}
            </div>
          )}
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
              onCancel={cancelSkill}
              onSave={saveSkill}
            />
            {!collapsed.skills && (
              <div className="px-5 pb-4">
                {/* Add form — supports multiple in a row */}
                {addingSkill && (
                  <div className="mb-3 p-3 bg-brand-50 rounded-xl border border-brand-100 space-y-2">
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

          {/* ── Portfolio ── */}
          <div className="border-b border-gray-100">
            <input ref={portfolioInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handlePortfolioPick} />
            <SectionHeader
              title="Portfolio" count={mediaFiles.length}
              editing={addingMedia} collapsed={collapsed.portfolio}
              onToggleCollapse={() => toggle("portfolio")}
              onAdd={() => setAddingMedia(true)} addLabel="Add"
              onCancel={() => { setAddingMedia(false); setMediaForm({ note: "", file: null, url: "", type: "photo" }); }}
              onSave={saveMedia}
            />
            {!collapsed.portfolio && (
              <div className="px-5 pb-4">
                {/* Add form */}
                {addingMedia && (
                  <div className="mb-3 p-3 bg-brand-50 rounded-xl border border-brand-100 space-y-2">
                    {mediaForm.url ? (
                      <div className="relative rounded-xl overflow-hidden bg-white aspect-video">
                        {mediaForm.type === "video"
                          ? <video src={mediaForm.url} controls className="w-full h-full object-contain" />
                          : <img src={mediaForm.url} alt="" className="w-full h-full object-contain" />}
                        <button onClick={() => setMediaForm((p) => ({ ...p, file: null, url: "", type: "photo" }))}
                          className="absolute top-2 right-2 w-6 h-6 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div onClick={() => portfolioInputRef.current?.click()}
                        className="rounded-xl border-2 border-dashed border-brand-200 h-20 flex flex-col items-center justify-center gap-1 text-brand-300 hover:text-brand-400 cursor-pointer transition-colors">
                        <Upload className="w-4 h-4" />
                        <span className="text-xs">Click to select photo or video</span>
                      </div>
                    )}
                    <div>
                      <label className={labelCls}>Note (optional)</label>
                      <input value={mediaForm.note} onChange={(e) => setMediaForm((p) => ({ ...p, note: e.target.value }))}
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
                          <button onClick={() => askConfirm("Remove media", "This media file will be removed from the portfolio. Continue?",
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
              </div>
            )}
          </div>

          {/* ── Show & Role (unified Home + Swing records) ── */}
          <div className="border-b border-gray-100">
            <SectionHeader
              title="Show & Role" count={activeShowRoleCount}
              editing={addingShowRole} collapsed={collapsed.showRole}
              onToggleCollapse={() => toggle("showRole")}
              onAdd={() => setAddingShowRole(true)} addLabel="Add"
              onCancel={() => { setAddingShowRole(false); setShowRoleForm({ show: "", role: "", roleType: "home" }); }}
              onSave={saveShowRole}
            />
            {!collapsed.showRole && (
              <div className="px-5 pb-4 space-y-2">
                {/* Add form */}
                {addingShowRole && (
                  <div className="p-3 bg-brand-50 rounded-xl space-y-2 border border-brand-100">
                    <div className="grid grid-cols-3 gap-2">
                      <div><label className={labelCls}>Show</label>
                        <select value={showRoleForm.show}
                          onChange={(e) => setShowRoleForm((f) => ({ ...f, show: e.target.value, role: "" }))}
                          className={inputCls + " bg-white"}>
                          <option value="">Please Choose</option>
                          {DATA.flatMap((l) => l.shows).map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                      </div>
                      <div><label className={labelCls}>Role</label>
                        <select value={showRoleForm.role}
                          onChange={(e) => setShowRoleForm((f) => ({ ...f, role: e.target.value }))}
                          disabled={!showRoleForm.show}
                          className={inputCls + " bg-white disabled:opacity-50"}>
                          <option value="">Please Choose</option>
                          {rolesForFormShow.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
                        </select>
                      </div>
                      <div><label className={labelCls}>Role Type</label>
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
                {/* Empty state */}
                {showRoleRecords.length === 0 && !addingShowRole && (
                  <p className="text-xs text-gray-300 py-3 text-center">No show assignments</p>
                )}
                {/* Column header */}
                {showRoleRecords.length > 0 && (
                  <div className="hidden sm:grid grid-cols-[1fr_110px_60px] gap-2 px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                    <span>Show &amp; Role</span>
                    <span>Last Modified</span>
                    <span></span>
                  </div>
                )}
                {/* Sorted: home first, swing by date desc */}
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
                        <div className="flex flex-col gap-1 sm:grid sm:grid-cols-[1fr_110px_60px] sm:gap-2 sm:items-center">
                          <div className="flex items-center gap-2 min-w-0 flex-wrap">
                            <span className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${chip}`}>
                              {rec.roleType === "home" ? "Home" : "Swing"}
                            </span>
                            <span className="text-xs font-semibold text-gray-900 truncate">{rec.show}</span>
                            <span className="text-xs text-gray-300">/</span>
                            <span className="text-xs font-medium text-gray-700 truncate">{rec.role}</span>
                          </div>
                          <div className="flex items-center justify-between sm:contents">
                            <span className="text-xs text-gray-400">{rec.date}</span>
                            {inactive ? (
                              <span className="text-xs text-gray-300">Removed</span>
                            ) : (
                              <button onClick={() => askConfirm("Remove show & role", `Remove ${rec.show} / ${rec.role}?`,
                                () => setShowRoleRecords((p) => p.map((r) => r.id === rec.id ? { ...r, status: "inactive" } : r)))}
                                className="text-xs text-red-400 hover:text-red-600 transition-colors text-left">Remove</button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* ── Measurement ── */}
          <div className="border-b border-gray-100">
            <MeasurementSection
              meas={meas} measDraft={measDraft} setMeasDraft={setMeasDraft}
              editing={editingMeas} collapsed={collapsed.measurements}
              onToggleCollapse={() => toggle("measurements")}
              onEdit={() => { setMeasDraft({ ...meas }); setEditingMeas(true); }}
              onSave={saveMeas}
              onCancel={() => setEditingMeas(false)}
              onUpload={() => setMeasImportOpen(true)}
            />
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
                {/* Add form — enum dropdowns */}
                {addingEvent && (
                  <div className="p-3 bg-brand-50 rounded-xl space-y-2 border border-brand-100">
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className={labelCls}>Event Name</label>
                        <select value={eventForm.eventName}
                          onChange={(e) => setEventForm((f) => ({ ...f, eventName: e.target.value, roleName: "" }))}
                          className={inputCls + " bg-white"}>
                          <option value="">Please Choose</option>
                          {EVENT_NAME_LIST.map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                      <div><label className={labelCls}>Role Name</label>
                        <select value={eventForm.roleName}
                          onChange={(e) => setEventForm((f) => ({ ...f, roleName: e.target.value }))}
                          disabled={!eventForm.eventName}
                          className={inputCls + " bg-white disabled:opacity-50"}>
                          <option value="">Please Choose</option>
                          {eventRolesForForm.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
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
                {eventRecords.map((rec) => {
                  const inactive = rec.status === "inactive";
                  return (
                    <div key={rec.id} className={`p-3 rounded-xl border ${inactive ? "border-gray-100 opacity-40" : "border-gray-200"}`}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs font-semibold text-gray-900 truncate">{rec.eventName}</span>
                          <span className="text-xs text-gray-300 flex-shrink-0">&amp;</span>
                          <span className="text-xs font-medium text-gray-700 truncate">{rec.roleName}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-gray-400">{rec.startDate}</span>
                          {inactive ? (
                            <span className="text-xs text-gray-300">Removed</span>
                          ) : (
                            <button onClick={() => askConfirm("Remove event", `Remove "${rec.eventName} & ${rec.roleName}"?`,
                              () => setEventRecords((p) => p.map((r) => r.id === rec.id ? { ...r, status: "inactive" } : r)))}
                              className="text-xs text-red-500 hover:text-red-700 px-1 py-0.5 rounded transition-colors">Remove</button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-400">{rec.startDate} 至 {rec.endDate}</p>
                    </div>
                  );
                })}
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
                    <button onClick={() => askConfirm("Remove attachment", `Remove "${att.name}"?`,
                      () => setAttachments((p) => p.filter((a) => a.id !== att.id)))}
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

const IMPORT_COLUMNS: { key: string; required: boolean }[] = [
  { key: "SSO", required: true },
  { key: "Full Name", required: true },
  { key: "Nationality", required: false },
  { key: "Gender", required: false },
  { key: "Height (cm)", required: false },
  { key: "Weight (kg)", required: false },
  { key: "Offer Show", required: false },
  { key: "Offer Role", required: false },
  { key: "Home Show", required: false },
  { key: "Home Role", required: false },
  { key: "Contract Start Date", required: false },
  { key: "Contract End Date", required: false },
  { key: "Employee Class", required: false },
  { key: "ID/Passport Valid End Date", required: false },
];

function RosterImportModal({ onClose }: { onClose: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<string[][]>([]);

  function downloadTemplate() {
    const header = IMPORT_COLUMNS.map((c) => c.required ? `${c.key} *` : c.key);
    const sample = [
      "20017233", "Arthur William Bennett", "UK", "Male", "178", "72",
      "UOP", "Dragon Dance", "UOP", "Dragon Dance",
      "2024-01-15", "2025-12-31", "Foreign Foreign", "2027-06-30",
    ];
    const ws = XLSX.utils.aoa_to_sheet([header, sample]);
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

  const dataRows = preview.slice(1);
  // SSO at col 0, Full Name at col 1; flag rows with either missing
  const invalidRowIdx = new Set<number>();
  dataRows.forEach((row, i) => {
    const sso = String(row[0] ?? "").trim();
    const name = String(row[1] ?? "").trim();
    if (!sso || !name) invalidRowIdx.add(i + 1); // +1 because preview[0] is header
  });
  const hasInvalid = invalidRowIdx.size > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[92vw] max-w-3xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Import Performers</h2>
            <p className="text-xs text-gray-400 mt-0.5">Upload an Excel file to bulk import performers</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-5 sm:px-6 py-4 sm:py-5 space-y-4 overflow-y-auto">
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
            <FileSpreadsheet className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-medium text-blue-700">Download template first</p>
              <p className="text-xs text-blue-500 mt-0.5">
                Required: <span className="text-red-500 font-semibold">SSO</span>, <span className="text-red-500 font-semibold">Full Name</span>.
                Rows without Home Show / Home Role go to Unassigned.
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
              {preview.length >= 6 && <p className="text-xs text-gray-400 px-3 py-2">Showing first 5 rows…</p>}
            </div>
          )}

          {hasInvalid && (
            <p className="text-xs text-red-500">
              {invalidRowIdx.size} row{invalidRowIdx.size === 1 ? "" : "s"} missing required SSO or Full Name (highlighted above). Fix before importing.
            </p>
          )}
        </div>
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 px-5 sm:px-6 pb-5 pt-3 border-t border-gray-50 sm:border-t-0">
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={onClose} disabled={!fileName || hasInvalid}
            className="px-5 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Import {dataRows.length > 0 ? `${dataRows.length} Performer${dataRows.length === 1 ? "" : "s"}` : ""}
          </button>
        </div>
      </div>
    </div>
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[92vw] max-w-lg max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm sm:text-base">
            Batch Assign for {target.ids.length} Performer{target.ids.length === 1 ? "" : "s"}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-5 sm:px-6 py-4 sm:py-5 space-y-4 overflow-y-auto">
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
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 px-5 sm:px-6 pb-5 pt-3 border-t border-gray-50 sm:border-t-0">
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={() => onSubmit({ ids: target.ids, assignToType, show, role, castType })} disabled={!canSave}
            className="px-5 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 disabled:opacity-40 transition-colors">Save</button>
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

// ── Card View ──────────────────────────────────────────────────────────────

function CardView({ selectedShow, selectedRole, castTab, setCastTab, onCast, showUnassigned }: {
  selectedShow: Show | null; selectedRole: Role | null;
  castTab: "home" | "swing"; setCastTab: (t: "home" | "swing") => void;
  onCast: (ids: number[]) => void; showUnassigned: boolean;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const activeFilterCount = Object.values(filters).filter((v) => v !== "").length;

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

  if (showUnassigned) {
    const unassignedAll = PERFORMERS.filter((p) => !p.homeShow);
    const unassigned = unassignedAll.filter((p) => actorMatchesFilters(p, filters));
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
            <button onClick={() => setShowFilter((p) => !p)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${showFilter ? "bg-brand-50 border-brand-300 text-brand-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
              <Filter className="w-4 h-4" />Filter
              {activeFilterCount > 0 && <span className="text-[10px] bg-brand-500 text-white rounded-full px-1.5 py-0.5">{activeFilterCount}</span>}
            </button>
          </div>
          {showFilter && <FilterPanel filters={filters} onChange={updateFilters} onClose={() => setShowFilter(false)} />}
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between mb-3 px-3 py-2 bg-brand-50 border border-brand-100 rounded-lg">
              <span className="text-xs text-brand-700 font-medium">已选择{selectedIds.size}项</span>
              <button onClick={() => { onCast(Array.from(selectedIds)); }}
                className="px-3.5 py-1.5 bg-brand-500 text-white rounded-lg text-xs font-medium hover:bg-brand-600 transition-colors">
                Assign Role
              </button>
            </div>
          )}
          {unassigned.length === 0 ? (
            <p className="text-sm text-gray-300 py-8 text-center">{unassignedAll.length === 0 ? "All performers are assigned" : "No performers match the filters"}</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
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

  const filteredActors = allActors.filter((a) => actorMatchesFilters(a, filters));

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
              <button onClick={() => onCast(Array.from(selectedIds))}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors shadow-sm">
                <Users className="w-4 h-4" />{selectedIds.size > 0 ? `Assign Role (${selectedIds.size})` : "Assign Cast"}
              </button>
            </div>
          </div>

          {/* Filter panel */}
          {showFilter && <FilterPanel filters={filters} onChange={updateFilters} onClose={() => setShowFilter(false)} />}

          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between mb-3 px-3 py-2 bg-brand-50 border border-brand-100 rounded-lg">
              <span className="text-xs text-brand-700 font-medium">已选择{selectedIds.size}项</span>
              <button onClick={() => setSelectedIds(new Set())} className="text-xs text-gray-500 hover:text-gray-700">Clear</button>
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
                  roleLabel={`${selectedShow.name} / ${selectedRole.name}`}
                  selected={selectedIds.has(item.actor.id)}
                  onSelect={() => toggleSelect(item.actor.id)} />
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
      {active ? (sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-brand-500" /> : <ArrowDown className="w-3 h-3 text-brand-500" />) : <ArrowUpDown className="w-3 h-3" />}
    </button>
  );
}

function RosterView({ onImport, selectedShow, selectedRole, showUnassigned }: {
  onImport: () => void;
  selectedShow: Show | null; selectedRole: Role | null; showUnassigned: boolean;
}) {
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [drawerActor, setDrawerActor] = useState<Actor | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const activeFilterCount = Object.values(filters).filter((v) => v !== "").length;

  function handleSort(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("asc"); }
  }

  function updateFilters(next: Filters) {
    setFilters(next);
    setPage(1);
  }

  const filtered = useMemo(() => PERFORMERS.filter((p) => actorMatchesFilters(p, filters)), [filters]);

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
      {drawerActor && (
        <ActorDetailDrawer actor={drawerActor} roleLabel={`${drawerActor.homeShow ?? "—"} / ${drawerActor.homeRole ?? "—"}`}
          onClose={() => setDrawerActor(null)} />
      )}

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
        <button onClick={onImport} className="ml-auto h-9 flex items-center gap-1.5 px-4 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors">
          <Upload className="w-3.5 h-3.5" />Upload
        </button>
      </div>

      {showFilter && (
        <div className="px-4 sm:px-5 pt-4 bg-gray-50">
          <FilterPanel filters={filters} onChange={updateFilters} onClose={() => setShowFilter(false)} />
        </div>
      )}

      {/* Mobile card list (<md) */}
      <div className="md:hidden flex-1 overflow-y-auto bg-gray-50 px-3 py-3 space-y-2">
        {pageRows.length === 0 && (
          <div className="text-center py-16 text-gray-300 text-sm">No performers found</div>
        )}
        {pageRows.map((p) => (
          <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-3 flex items-start gap-3 active:bg-gray-50"
            onClick={() => setDrawerActor(p)}>
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
                <span className="truncate">
                  {p.homeShow ? <>{p.homeShow} &amp; <span className="text-gray-700 font-medium">{p.homeRole}</span></> : "—"}
                </span>
                <span>End <span className="text-gray-700 font-medium">{p.contractEndDate ?? "—"}</span></span>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setDrawerActor(p); }}
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
              <th className="text-left px-4 py-3 font-semibold">Current Home Show &amp; Role</th>
              <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">
                Contract end date <SortBtn col="contractEndDate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              </th>
              <th className="text-left px-4 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-50">
            {pageRows.length === 0 && (
              <tr><td colSpan={8} className="text-center py-16 text-gray-300 text-sm">No performers found</td></tr>
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
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                  {p.homeShow ? <>{p.homeShow} &amp; <span className="text-gray-800">{p.homeRole}</span></> : "—"}
                </td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{p.contractEndDate ?? "—"}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <button onClick={() => setDrawerActor(p)} className="text-xs text-brand-500 hover:text-brand-700 font-medium transition-colors">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Paginator page={safeP} totalPages={totalPages} pageSize={pageSize} pageSizeOptions={[10, 20, 50]}
        totalItems={sorted.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
    </div>
  );
}

// ── Left Sidebar ───────────────────────────────────────────────────────────

function LeftSidebar({
  viewMode, onChangeViewMode,
  selectedShowId, selectedRoleId, showUnassigned,
  onSelectUnassigned, onSelectShow, onSelectRole,
  isMobileOpen, onClose,
}: {
  viewMode: ViewMode; onChangeViewMode: (m: ViewMode) => void;
  selectedShowId: string; selectedRoleId: string | null; showUnassigned: boolean;
  onSelectUnassigned: () => void;
  onSelectShow: (showId: string) => void;
  onSelectRole: (showId: string, roleId: string) => void;
  isMobileOpen: boolean;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [expandedShowIds, setExpandedShowIds] = useState<Set<string>>(() => new Set([selectedShowId]));
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
      {/* View Mode Segmented Switch */}
      <div className="px-3 py-3 border-b border-gray-100">
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
          {([
            ["card", "Card", LayoutGrid],
            ["roster", "Roster", List],
          ] as const).map(([val, lbl, Icon]) => (
            <button key={val} onClick={() => onChangeViewMode(val)}
              className={`flex-1 flex items-center justify-center gap-1.5 h-7 rounded-md text-xs font-medium transition-all ${viewMode === val ? "bg-brand-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              <Icon className="w-3.5 h-3.5" />{lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-gray-100">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Show or role name"
          className="w-full h-8 px-2.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-200 placeholder:text-gray-300" />
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 text-sm">
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
            const isShowSelected = show.id === selectedShowId && !showUnassigned && selectedRoleId === null;
            return (
              <div key={show.id}>
                <button onClick={() => { onSelectShow(show.id); toggleExpand(show.id); }}
                  className={`w-full flex items-center justify-between pl-6 pr-3 py-1.5 rounded-lg text-left transition-colors ${isShowSelected ? "bg-brand-50 text-brand-700 font-medium" : "text-gray-700 hover:bg-gray-50"}`}>
                  <span className="flex items-center gap-1.5">
                    <span>{show.name}</span>
                    <span className={`text-xs ${isShowSelected ? "text-brand-500" : "text-gray-400"}`}>({showCount})</span>
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

type ViewMode = "card" | "roster";

export default function CastingBookPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [selectedShowId, setSelectedShowId] = useState<string>(DATA[0].shows[0].id);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [castTab, setCastTab] = useState<"home" | "swing">("home");
  const [assignTarget, setAssignTarget] = useState<AssignTarget | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function closeSidebarOnMobile() {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }

  const allShowsFlat = useMemo(() => DATA.flatMap((l) => l.shows), []);
  const selectedShow = useMemo(() => allShowsFlat.find((s) => s.id === selectedShowId) ?? null, [allShowsFlat, selectedShowId]);
  const selectedRole = useMemo(() => selectedRoleId ? selectedShow?.roles.find((r) => r.id === selectedRoleId) ?? null : null, [selectedShow, selectedRoleId]);

  function selectShow(showId: string) { setSelectedShowId(showId); setSelectedRoleId(null); setCastTab("home"); setShowUnassigned(false); }
  function selectRole(roleId: string) { setSelectedRoleId(roleId); setCastTab("home"); setShowUnassigned(false); }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 flex-shrink-0 h-14 px-4 sm:px-5 flex items-center gap-3 z-30">
        <button
          type="button"
          aria-label="Open navigation"
          onClick={() => setSidebarOpen(true)}
          className="md:hidden -ml-1 p-2 rounded-md text-gray-600 hover:bg-gray-100"
        >
          <Menu className="w-5 h-5" />
        </button>
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
          viewMode={viewMode}
          onChangeViewMode={(m) => { setViewMode(m); closeSidebarOnMobile(); }}
          selectedShowId={selectedShowId}
          selectedRoleId={selectedRoleId}
          showUnassigned={showUnassigned}
          onSelectUnassigned={() => { setShowUnassigned(true); setSelectedRoleId(null); closeSidebarOnMobile(); }}
          onSelectShow={(showId) => { selectShow(showId); closeSidebarOnMobile(); }}
          onSelectRole={(showId, roleId) => { setSelectedShowId(showId); selectRole(roleId); closeSidebarOnMobile(); }}
          isMobileOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {viewMode === "card" && (
            <CardView selectedShow={selectedShow} selectedRole={selectedRole}
              castTab={castTab} setCastTab={setCastTab}
              onCast={(ids) => setAssignTarget({
                ids,
                defaultShow: selectedShow?.name,
                defaultRole: selectedRole?.name,
                defaultRoleType: castTab,
              })}
              showUnassigned={showUnassigned} />
          )}
          {viewMode === "roster" && <RosterView onImport={() => setShowImportModal(true)} selectedShow={selectedShow} selectedRole={selectedRole} showUnassigned={showUnassigned} />}
        </div>
      </div>

      {assignTarget && (
        <BatchAssignDialog
          target={assignTarget}
          onClose={() => setAssignTarget(null)}
          onSubmit={() => setAssignTarget(null)}
        />
      )}
      {showImportModal && <RosterImportModal onClose={() => setShowImportModal(false)} />}
    </div>
  );
}
