/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useMemo, useRef, useCallback, createContext, useContext } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  BookOpen, X, Pencil, Upload, Play, ChevronDown, ChevronUp,
  Trash2,
  RotateCcw, Eye, Users, UserX, Plus,
  ChevronLeft, ChevronRight, Camera, Download, FileSpreadsheet,
  Filter, Check, Menu, ArrowLeft,
} from "lucide-react";
import * as XLSX from "xlsx";
import BottomSheet from "@/components/BottomSheet";
import useDocumentTitle from "@/lib/useDocumentTitle";

// ── Types ──────────────────────────────────────────────────────────────────

interface MediaFile { type: "photo" | "video"; url: string; duration?: string; note?: string; photographer?: string; show?: string; role?: string }
interface SkillEntry { id: string; type: string; skill: string }
interface ShowRoleRecord {
  id: string; show: string; role: string; roleType: "home" | "swing";
  date: string; status: "active" | "inactive"; endDate?: string;
}
interface EventRecord { id: string; eventName: string; roleName: string; startDate: string; endDate: string; status: "active" | "inactive" }
interface FittingRecord {
  id: string; date: string;
  kind: "show" | "event";
  show?: string; role?: string;
  eventName?: string; eventRole?: string;
  result: "Suitable" | "Not Suitable";
  note?: string;
  status: "active" | "inactive"; endDate?: string;
}

type ActorStatus = "Employed" | "Terminated";
const ACTOR_STATUSES: ActorStatus[] = ["Employed", "Terminated"];
const STATUS_BADGE: Record<ActorStatus, { bg: string; text: string; dot: string }> = {
  "Employed":   { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  "Terminated": { bg: "bg-rose-50",    text: "text-rose-600",    dot: "bg-rose-400" },
};

// Status override state: actor objects come from module-level constants so
// in-session edits are kept here and merged on read. Status only ever flips
// Employed → Terminated (via the Terminate flow); there is no reactivation.
const StatusCtx = createContext<{
  statusOf: (a: Actor) => ActorStatus;
  setStatusFor: (ids: number[], status: ActorStatus) => void;
}>({ statusOf: (a) => a.status ?? "Employed", setStatusFor: () => {} });
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

interface Actor {
  id: number; ssoId: string; name: string; nationality: string; flag: string;
  gender?: "men" | "women";
  height: number; weight: number; photoUrl: string;
  homeShow?: string; homeRole?: string;
  performerCategory?: string;
  voiceRange?: string;
  language?: string;
  status?: ActorStatus;
  pendingPhone?: string;
  skillEntries?: SkillEntry[];
  mediaFiles?: MediaFile[]; showRoleRecords?: ShowRoleRecord[]; eventRecords?: EventRecord[]; fittingRecords?: FittingRecord[];
}

interface Role { id: string; name: string; headCount: number; homeActors: Actor[]; swingActors: Actor[]; performerCategory: string }
interface Show { id: string; name: string; roles: Role[]; performanceType: string }

// ── New constants ──────────────────────────────────────────────────────────
const VOICE_RANGE_OPTIONS = ["Soprano", "Mezzo-Soprano", "Alto", "Tenor", "Baritone", "Bass", "Coloratura Soprano", "Countertenor"];
const LANGUAGE_OPTIONS = ["Mandarin Chinese", "English (US)", "English (UK)", "Cantonese", "Japanese", "Korean", "Spanish", "French", "German"];
const PERFORMER_CATEGORIES = ["Voice Actor", "Stunt Performer", "Singer", "Dancer", "Character Performer"];
const PERFORMANCE_TYPES = ["Stage Musical", "Parade", "Character Meet & Greet"];

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

const ACTOR_POOL: { name: string; nationality: string; flag: string; gender: "men" | "women"; performerCategory: string }[] = [
  { name: "Arthur William Bennett", nationality: "UK", flag: "🇬🇧", gender: "men", performerCategory: "Singer" },
  { name: "Oliver James Carter", nationality: "UK", flag: "🇬🇧", gender: "men", performerCategory: "Dancer" },
  { name: "Alvin Yang Chao 杨超", nationality: "China", flag: "🇨🇳", gender: "men", performerCategory: "Stunt Performer" },
  { name: "Lily Grace Wilson", nationality: "USA", flag: "🇺🇸", gender: "women", performerCategory: "Singer" },
  { name: "Chloe Rose Taylor", nationality: "UK", flag: "🇬🇧", gender: "women", performerCategory: "Dancer" },
  { name: "Emma Sophie Davis", nationality: "Australia", flag: "🇦🇺", gender: "women", performerCategory: "Character Performer" },
  { name: "Liam Noah Johnson", nationality: "Canada", flag: "🇨🇦", gender: "men", performerCategory: "Voice Actor" },
  { name: "Sofia Mia Martinez", nationality: "USA", flag: "🇺🇸", gender: "women", performerCategory: "Singer" },
  { name: "Ethan Mason Brown", nationality: "UK", flag: "🇬🇧", gender: "men", performerCategory: "Dancer" },
  { name: "Chen Wei 陈威", nationality: "China", flag: "🇨🇳", gender: "men", performerCategory: "Stunt Performer" },
  { name: "Yuki Tanaka 田中雪", nationality: "Japan", flag: "🇯🇵", gender: "women", performerCategory: "Character Performer" },
  { name: "Min Ji Park 朴敏智", nationality: "Korea", flag: "🇰🇷", gender: "women", performerCategory: "Singer" },
  { name: "Lucas Gabriel Silva", nationality: "Brazil", flag: "🇧🇷", gender: "men", performerCategory: "Stunt Performer" },
  { name: "Isabella Rossi", nationality: "Italy", flag: "🇮🇹", gender: "women", performerCategory: "Singer" },
  { name: "Zoe Hannah White", nationality: "Australia", flag: "🇦🇺", gender: "women", performerCategory: "Dancer" },
  { name: "Wang Fang 王芳", nationality: "China", flag: "🇨🇳", gender: "women", performerCategory: "Dancer" },
  { name: "James Patrick Lee", nationality: "USA", flag: "🇺🇸", gender: "men", performerCategory: "Voice Actor" },
  { name: "Sarah Elizabeth Moore", nationality: "UK", flag: "🇬🇧", gender: "women", performerCategory: "Singer" },
  { name: "Ryan Michael Scott", nationality: "Canada", flag: "🇨🇦", gender: "men", performerCategory: "Character Performer" },
  { name: "Mei Lin Zhang 张美琳", nationality: "China", flag: "🇨🇳", gender: "women", performerCategory: "Singer" },
  { name: "Thomas Edward Clark", nationality: "UK", flag: "🇬🇧", gender: "men", performerCategory: "Dancer" },
  { name: "Jessica Anne Harris", nationality: "USA", flag: "🇺🇸", gender: "women", performerCategory: "Character Performer" },
  { name: "Marco Antonio López", nationality: "Spain", flag: "🇪🇸", gender: "men", performerCategory: "Stunt Performer" },
  { name: "Hana Sato 佐藤花", nationality: "Japan", flag: "🇯🇵", gender: "women", performerCategory: "Dancer" },
  { name: "Kevin Andrew Young", nationality: "Canada", flag: "🇨🇦", gender: "men", performerCategory: "Stunt Performer" },
  { name: "Anna Marie König", nationality: "Germany", flag: "🇩🇪", gender: "women", performerCategory: "Voice Actor" },
  { name: "Liu Yang 刘阳", nationality: "China", flag: "🇨🇳", gender: "men", performerCategory: "Dancer" },
  { name: "Charlotte Emily Green", nationality: "UK", flag: "🇬🇧", gender: "women", performerCategory: "Singer" },
  { name: "Priya Sharma", nationality: "India", flag: "🇮🇳", gender: "women", performerCategory: "Character Performer" },
  { name: "Diego Alejandro Ruiz", nationality: "Mexico", flag: "🇲🇽", gender: "men", performerCategory: "Stunt Performer" },
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

function genActorStatus(seed: number): ActorStatus {
  const h = dHash(seed * 71) % 100;
  return h < 88 ? "Employed" : "Terminated";
}

const VOICE_RANGE_POOL = VOICE_RANGE_OPTIONS;
function genVoiceRange(seed: number): string | undefined {
  const h = dHash(seed * 43) % 10;
  return h < 7 ? VOICE_RANGE_POOL[dHash(seed * 37) % VOICE_RANGE_POOL.length] : undefined;
}

function genLanguage(seed: number): string {
  return LANGUAGE_OPTIONS[dHash(seed * 53) % LANGUAGE_OPTIONS.length];
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
    const actorSeed = seed * 100 + i;
    return {
      id: actorSeed,
      ssoId: `${20010000 + (dHash(seed * 5 + i) % 990000)}`,
      name: pool.name, nationality: pool.nationality, flag: pool.flag,
      gender: pool.gender,
      height, weight,
      performerCategory: pool.performerCategory,
      voiceRange: genVoiceRange(actorSeed),
      language: genLanguage(actorSeed),
      photoUrl: `https://randomuser.me/api/portraits/${pool.gender}/${photoNum}.jpg`,
      status: genActorStatus(actorSeed),
      skillEntries: genSkillEntries(actorSeed),
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

const FITTING_RESULTS: ("Suitable" | "Not Suitable")[] = ["Suitable", "Not Suitable"];
const FITTING_NOTES = ["Good stage presence, recommended for callback", "Costume fit confirmed", "Needs alteration before next fitting", "Schedule conflict, rescheduled", "", ""];

function genFittingRecords(seed: number): FittingRecord[] {
  const count = dHash(seed * 41) % 4;
  return Array.from({ length: count }, (_, i) => {
    const h = dHash(seed * 47 + i);
    const daysAgo = (h % 200) + 5;
    const date = new Date(Date.now() - daysAgo * 86400000).toISOString().split("T")[0];
    const result = dHash(seed * 53 + i) % 5 < 4 ? "Suitable" : "Not Suitable";
    const note = FITTING_NOTES[dHash(seed * 59 + i) % FITTING_NOTES.length];
    const status = (h % 7 === 0 ? "inactive" : "active") as "active" | "inactive";
    const base = {
      id: `ft-${seed}-${i}`, date,
      result: FITTING_RESULTS[result === "Suitable" ? 0 : 1],
      note: note || undefined, status,
      endDate: status === "inactive" ? new Date(Date.now() - (daysAgo - 30) * 86400000).toISOString().split("T")[0] : undefined,
    };
    if (h % 2 === 0) {
      const pair = SHOW_ROLE_PAIRS[dHash(seed * 61 + i) % SHOW_ROLE_PAIRS.length];
      return { ...base, kind: "show" as const, show: pair.show, role: pair.role };
    }
    const eventOpt = EVENT_OPTIONS[dHash(seed * 67 + i) % EVENT_OPTIONS.length];
    const eventRole = eventOpt.roles[dHash(seed * 71 + i) % eventOpt.roles.length];
    return { ...base, kind: "event" as const, eventName: eventOpt.event, eventRole };
  });
}

function makeRole(id: string, name: string, performerCategory: string, homeSeed: number, homeCount: number, swingSeed: number, swingCount: number): Role {
  const vacancy = dHash(homeSeed * 37) % 6;
  return {
    id, name, performerCategory,
    headCount: homeCount + vacancy,
    homeActors: genActors(homeSeed, homeCount),
    swingActors: genActors(swingSeed, swingCount),
  };
}

const DATA: Show[] = [
  { id: "uop", name: "UOP", performanceType: "Parade", roles: [
    makeRole("uop-pw", "Parade Wushu", "Dancer", 101, 5, 102, 2),
    makeRole("uop-pv", "Parade Viper", "Dancer", 103, 8, 104, 3),
    makeRole("uop-dragon", "Dragon Dance", "Dancer", 105, 12, 106, 4),
    makeRole("uop-acrobat", "Acrobat Troupe", "Stunt Performer", 107, 10, 108, 3),
    makeRole("uop-fan", "Fan Dance", "Dancer", 109, 20, 110, 5),
    makeRole("uop-drum", "Drum Corps", "Dancer", 111, 15, 112, 4),
    makeRole("uop-lion", "Lion Dance", "Dancer", 113, 8, 114, 2),
    makeRole("uop-ribbon", "Ribbon Ensemble", "Dancer", 115, 18, 116, 5),
    makeRole("uop-stilt", "Stilt Walkers", "Stunt Performer", 117, 6, 118, 2),
    makeRole("uop-float", "Float Performers", "Character Performer", 119, 57, 120, 12),
  ]},
  { id: "uchmmg", name: "UCHMMG", performanceType: "Stage Musical", roles: [
    makeRole("uchmmg-ollivanders", "Ollivanders", "Character Performer", 201, 16, 202, 3),
    makeRole("uchmmg-conductor", "Conductor", "Singer", 203, 3, 204, 1),
    makeRole("uchmmg-triwizard", "Triwizard Spirit Rally", "Singer", 205, 18, 206, 4),
    makeRole("uchmmg-frog", "Frog Choir", "Singer", 207, 9, 208, 2),
    makeRole("uchmmg-wand", "Wand Ceremony", "Character Performer", 209, 9, 210, 2),
  ]},
  { id: "tsmmg", name: "TSMMG", performanceType: "Character Meet & Greet", roles: [
    makeRole("tsmmg-raptor", "Raptor Encounter", "Character Performer", 301, 31, 302, 8),
    makeRole("tsmmg-tf", "Transformers", "Character Performer", 303, 23, 304, 6),
    makeRole("tsmmg-po", "Po Live", "Character Performer", 305, 4, 306, 1),
    makeRole("tsmmg-baby", "Baby Raptor", "Character Performer", 307, 3, 308, 1),
    makeRole("tsmmg-veloci", "Velocicoaster Crew", "Stunt Performer", 309, 10, 310, 3),
  ]},
  { id: "rptea", name: "RPTEA", performanceType: "Stage Musical", roles: [
    makeRole("rptea-knights", "Knights Tournament", "Stunt Performer", 401, 45, 402, 10),
    makeRole("rptea-dragon", "Dragon Show", "Dancer", 403, 30, 404, 8),
    makeRole("rptea-royal", "Royal Procession", "Character Performer", 405, 60, 406, 15),
    makeRole("rptea-jester", "Jester Performance", "Character Performer", 407, 20, 408, 5),
    makeRole("rptea-guard", "Castle Guard", "Character Performer", 409, 71, 410, 18),
  ]},
  { id: "pl", name: "PL", performanceType: "Stage Musical", roles: [
    makeRole("pl-main", "Main Stage Cast", "Singer", 501, 25, 502, 6),
    makeRole("pl-street", "Street Performers", "Dancer", 503, 20, 504, 5),
    makeRole("pl-parade", "Parade Lead", "Dancer", 505, 15, 506, 4),
    makeRole("pl-greet", "Meet & Greet", "Character Performer", 507, 11, 508, 3),
  ]},
];

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
  // ~1 in 6 performers was imported without a proper 8-digit "2…" SSO — they
  // carry a placeholder phone number and surface in the Replace SSO flow.
  const needsSso = dHash(seed * 23) % 6 === 0;
  const ssoId = needsSso
    ? String(60000001 + (dHash(seed * 19) % 9999998))
    : `2001${String(7000 + dHash(seed * 19) % 3000)}`;
  return {
    id: 9000 + seed, ssoId,
    name: pool.name, nationality: pool.nationality, flag: pool.flag,
    gender: pool.gender,
    height, weight,
    performerCategory: pool.performerCategory,
    voiceRange: genVoiceRange(9000 + seed),
    language: genLanguage(9000 + seed),
    photoUrl: `https://randomuser.me/api/portraits/${pool.gender}/${photoNum}.jpg`,
    homeShow: pair.show, homeRole: pair.role,
    status: genActorStatus(9000 + seed),
    pendingPhone: needsSso ? ssoId : undefined,
    skillEntries: genSkillEntries(seed),
    mediaFiles,
    showRoleRecords: genShowRoleRecords(seed, pair.show, pair.role, contractEndDate),
    eventRecords: genEventRecords(seed),
    fittingRecords: genFittingRecords(seed),
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
    language: a.language ?? genLanguage(seed),
    mediaFiles,
    showRoleRecords: a.showRoleRecords ?? genShowRoleRecords(seed, showName, roleName, fallbackDate),
    eventRecords: a.eventRecords ?? genEventRecords(seed),
    fittingRecords: a.fittingRecords ?? genFittingRecords(seed),
  };
}

function findActorById(id: number): Actor | null {
  const fromPerformers = PERFORMERS.find((p) => p.id === id);
  if (fromPerformers) return fromPerformers;
  for (const show of DATA) {
    for (const role of show.roles) {
      const inHome = role.homeActors.find((x) => x.id === id);
      if (inHome) return enrichActor(inHome, show.name, role.name);
      const inSwing = role.swingActors.find((x) => x.id === id);
      if (inSwing) return enrichActor(inSwing, show.name, role.name);
    }
  }
  return null;
}

const ALL_ACTORS_BY_SSO: Actor[] = (() => {
  const map = new Map<number, Actor>();
  PERFORMERS.forEach((p) => map.set(p.id, p));
  for (const show of DATA) {
    for (const role of show.roles) {
      role.homeActors.forEach((a) => map.set(a.id, enrichActor(a, show.name, role.name)));
      role.swingActors.forEach((a) => map.set(a.id, enrichActor(a, show.name, role.name)));
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
  const hasInfo = file.show || file.role || file.photographer || file.note;
  return (
    <div className="fixed inset-0 z-[80] bg-black flex flex-col" onClick={onClose}>
      {/* Close */}
      <button onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-4 right-4 z-10 w-9 h-9 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors">
        <X className="w-5 h-5" />
      </button>
      {/* Image area */}
      <div className="flex-1 relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <button onClick={(e) => { e.stopPropagation(); setIdx((i) => Math.max(0, i - 1)); }} disabled={idx === 0}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white disabled:opacity-30 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        {file.type === "video" ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="relative w-full h-full">
              <img src={file.url} alt="" className="w-full h-full object-contain" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="w-16 h-16 bg-white/30 rounded-full flex items-center justify-center">
                  <Play className="w-8 h-8 text-white fill-white ml-1" />
                </div>
              </div>
              {file.duration && <span className="absolute bottom-3 left-3 text-xs text-white bg-black/60 px-1.5 py-0.5 rounded">{file.duration}</span>}
            </div>
          </div>
        ) : (
          <img src={file.url} alt="" className="w-full h-full object-contain" />
        )}
        <button onClick={(e) => { e.stopPropagation(); setIdx((i) => Math.min(files.length - 1, i + 1)); }} disabled={idx === files.length - 1}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white disabled:opacity-30 transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      {/* Bottom info bar */}
      <div className="flex-shrink-0 bg-black/85 px-5 py-3" onClick={(e) => e.stopPropagation()}>
        {hasInfo && (
          <div className="space-y-1 mb-2">
            {(file.show || file.role) && (
              <p className="text-sm font-semibold text-white">{[file.show, file.role].filter(Boolean).join(" / ")}</p>
            )}
            {file.photographer && <p className="text-xs text-gray-300">📷 {file.photographer}</p>}
            {file.note && <p className="text-xs text-gray-400">{file.note}</p>}
          </div>
        )}
        <p className="text-xs text-gray-500 text-center">{idx + 1} / {files.length}</p>
      </div>
    </div>
  );
}

// ── Photo Meta Edit Modal ─────────────────────────────────────────────────

function PhotoMetaEditModal({ file, onSave, onClose }: {
  file: MediaFile;
  onSave: (updates: Pick<MediaFile, "show" | "role" | "photographer" | "note">) => void;
  onClose: () => void;
}) {
  const inputCls = "w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300 bg-white";
  const labelCls = "block text-xs text-gray-400 mb-1";
  const [form, setForm] = useState({
    show: file.show ?? "",
    role: file.role ?? "",
    photographer: file.photographer ?? "",
    note: file.note ?? "",
  });
  const showRoles = ALL_SHOWS.find((s) => s.name === form.show)?.roles ?? [];
  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Edit Photo Info</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="w-full h-28 rounded-xl overflow-hidden bg-gray-100">
            <img src={file.url} alt="" className="w-full h-full object-cover object-top" />
          </div>
          <div>
            <label className={labelCls}>Show (optional)</label>
            <select value={form.show} onChange={(e) => setForm((f) => ({ ...f, show: e.target.value, role: "" }))} className={inputCls}>
              <option value="">Select show</option>
              {ALL_SHOWS.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Role (optional)</label>
            <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              disabled={!form.show} className={inputCls + " disabled:opacity-50"}>
              <option value="">Select role</option>
              {showRoles.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Photographer (optional)</label>
            <input value={form.photographer} onChange={(e) => setForm((f) => ({ ...f, photographer: e.target.value }))}
              className={inputCls} placeholder="Photographer name" />
          </div>
          <div>
            <label className={labelCls}>Note (optional)</label>
            <input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              className={inputCls} placeholder="e.g. Front pose, stage lighting" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5">
          <button onClick={onClose}
            className="px-4 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={() => { onSave(form); onClose(); }}
            className="flex items-center gap-1 px-4 py-2 bg-brand-500 text-white rounded-lg text-xs font-medium hover:bg-brand-600 transition-colors">
            <Check className="w-3 h-3" />Save
          </button>
        </div>
      </div>
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

// ── Inactivate Dialog (Show & Role / Event) ────────────────────────────────
// Per 0527 spec: inactivating a record prompts for an expiry date defaulting to
// today (editable).
function InactivateDialog({ label, defaultDate, onConfirm, onCancel }: {
  label: string; defaultDate: string;
  onConfirm: (endDate: string) => void; onCancel: () => void;
}) {
  const [endDate, setEndDate] = useState(defaultDate);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 pt-5 pb-4">
          <h3 className="text-sm font-semibold text-gray-900">Set Inactive</h3>
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">{label} will be set to inactive. Choose the effective expiry date.</p>
          <div className="mt-3">
            <label className="block text-xs text-gray-400 mb-1">Expiry Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-200" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 pb-5">
          <button onClick={onCancel}
            className="px-4 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={() => onConfirm(endDate)} disabled={!endDate}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white rounded-lg text-xs font-medium transition-colors">Set Inactive</button>
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
  show: string; role: string;
  showType: string;
  performerCategory: string;
  voiceRange: string;
  language: string;
  eventName: string; eventRoleName: string;
  nationality: string;
  status: ActorStatus | "All";
}

const DEFAULT_FILTER_STATUS: ActorStatus = "Employed";
const EMPTY_FILTERS: Filters = {
  performer: "",
  heightMin: "", heightMax: "", weightMin: "", weightMax: "",
  gender: "", skillType: "", skillSub: "",
  show: "", role: "",
  showType: "",
  performerCategory: "",
  voiceRange: "",
  language: "",
  eventName: "", eventRoleName: "",
  nationality: "",
  status: DEFAULT_FILTER_STATUS,
};

// A show's performance type is a property of the show (per master data); used
// by the Show Type filter to match performers via their home or active swing assignments.
function showPerformanceType(showName?: string): string | undefined {
  return DATA.find((s) => s.name === showName)?.performanceType;
}

const NON_CN = "NON_CN";

function hasAnyFilter(f: Filters): boolean {
  return Object.entries(f).some(([k, v]) => {
    if (k === "status") return v !== DEFAULT_FILTER_STATUS;
    return v !== "";
  });
}

function countActiveFilters(f: Filters): number {
  let n = 0;
  for (const [k, v] of Object.entries(f)) {
    if (k === "status") { if (v !== DEFAULT_FILTER_STATUS) n++; }
    else if (v !== "") n++;
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
  if (f.show || f.role) {
    const matchHome = (!f.show || a.homeShow === f.show) && (!f.role || a.homeRole === f.role);
    const matchSwing = a.showRoleRecords?.some((r) => r.status === "active" && r.roleType === "swing"
      && (!f.show || r.show === f.show) && (!f.role || r.role === f.role));
    if (!matchHome && !matchSwing) return false;
  }
  if (f.performerCategory && a.performerCategory !== f.performerCategory) return false;
  if (f.voiceRange && a.voiceRange !== f.voiceRange) return false;
  if (f.language && a.language !== f.language) return false;
  if (f.showType) {
    const matchHome = showPerformanceType(a.homeShow) === f.showType;
    const matchSwing = a.showRoleRecords?.some((r) => r.status === "active" && r.roleType === "swing"
      && showPerformanceType(r.show) === f.showType);
    if (!matchHome && !matchSwing) return false;
  }
  if (f.eventName || f.eventRoleName) {
    const hit = a.eventRecords?.some((e) => e.status === "active"
      && (!f.eventName || e.eventName === f.eventName)
      && (!f.eventRoleName || e.roleName === f.eventRoleName));
    if (!hit) return false;
  }
  if (f.nationality) {
    if (f.nationality === NON_CN) {
      if (a.nationality === "China") return false;
    } else if (a.nationality !== f.nationality) return false;
  }
  if (f.status !== "All") {
    const cur = statusOf ? statusOf(a) : (a.status ?? "Employed");
    if (cur !== f.status) return false;
  }
  return true;
}

const ALL_SHOWS = DATA;
const ALL_NATIONALITIES = [...new Set(ACTOR_POOL.map((a) => a.nationality))].sort();
const NATIONALITY_FLAGS: Record<string, string> = ACTOR_POOL.reduce((m, a) => {
  m[a.nationality] = a.flag;
  return m;
}, {} as Record<string, string>);

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

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-sm mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <div>
          <label className={lblCls}>Performer</label>
          <input value={filters.performer} onChange={(e) => set("performer", e.target.value)} placeholder="Name or SSO" className={fieldCls} />
        </div>
        <div>
          <label className={lblCls}>Height (cm)</label>
          <div className="grid grid-cols-2 gap-1.5">
            <input value={filters.heightMin} onChange={(e) => set("heightMin", e.target.value)} placeholder="Min" type="number" className={fieldCls} />
            <input value={filters.heightMax} onChange={(e) => set("heightMax", e.target.value)} placeholder="Max" type="number" className={fieldCls} />
          </div>
        </div>
        <div>
          <label className={lblCls}>Weight (kg)</label>
          <div className="grid grid-cols-2 gap-1.5">
            <input value={filters.weightMin} onChange={(e) => set("weightMin", e.target.value)} placeholder="Min" type="number" className={fieldCls} />
            <input value={filters.weightMax} onChange={(e) => set("weightMax", e.target.value)} placeholder="Max" type="number" className={fieldCls} />
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
          <label className={lblCls}>Performer Category</label>
          <select value={filters.performerCategory} onChange={(e) => set("performerCategory", e.target.value)} className={fieldCls}>
            <option value="">All</option>
            {PERFORMER_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={lblCls}>Voice Range</label>
          <select value={filters.voiceRange} onChange={(e) => set("voiceRange", e.target.value)} className={fieldCls}>
            <option value="">All</option>
            {VOICE_RANGE_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className={lblCls}>Show Type</label>
          <select value={filters.showType} onChange={(e) => set("showType", e.target.value)} className={fieldCls}>
            <option value="">All</option>
            {PERFORMANCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className={lblCls}>Language</label>
          <select value={filters.language} onChange={(e) => set("language", e.target.value)} className={fieldCls}>
            <option value="">All</option>
            {LANGUAGE_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={lblCls}>Show &amp; Role</label>
          <div className="grid grid-cols-2 gap-1.5">
            <select value={filters.show} onChange={(e) => onChange({ ...filters, show: e.target.value, role: "" })} className={fieldCls}>
              <option value="">All Shows</option>
              {ALL_SHOWS.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
            <select value={filters.role} onChange={(e) => set("role", e.target.value)} disabled={!filters.show} className={fieldCls + " disabled:opacity-50"}>
              <option value="">All Roles</option>
              {rolesForShow(filters.show).map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={lblCls}>Skillset</label>
          <div className="grid grid-cols-2 gap-1.5">
            <select value={filters.skillType} onChange={(e) => onChange({ ...filters, skillType: e.target.value, skillSub: "" })} className={fieldCls}>
              <option value="">Category</option>
              {SKILLSET_CATEGORIES.map((c) => <option key={c.type} value={c.type}>{c.type}</option>)}
            </select>
            <select value={filters.skillSub} onChange={(e) => set("skillSub", e.target.value)} disabled={!filters.skillType} className={fieldCls + " disabled:opacity-50"}>
              <option value="">Sub</option>
              {skillsForType.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className={lblCls}>Event Experience</label>
          <div className="grid grid-cols-2 gap-1.5">
            <select value={filters.eventName} onChange={(e) => onChange({ ...filters, eventName: e.target.value, eventRoleName: "" })} className={fieldCls}>
              <option value="">All Events</option>
              {EVENT_NAME_LIST.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <select value={filters.eventRoleName} onChange={(e) => set("eventRoleName", e.target.value)} disabled={!filters.eventName} className={fieldCls + " disabled:opacity-50"}>
              <option value="">All Roles</option>
              {rolesForEvent(filters.eventName).map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={lblCls}>Nationality</label>
          <select value={filters.nationality} onChange={(e) => set("nationality", e.target.value)} className={fieldCls}>
            <option value="">All</option>
            <option value={NON_CN}>Non-CN</option>
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

type BasicForm = { nationality: string; gender: "men" | "women"; height: string; weight: string; voiceRange: string; language: string };

function BasicInfoMobile({
  actor, headshotUrl, status, nationality, flag, voiceRange, language,
  editing, form, onForm, onEdit, onCancelEdit, onSave, onBack,
}: {
  actor: Actor; headshotUrl: string; status: ActorStatus;
  nationality: string; flag: string; voiceRange: string; language: string;
  editing: boolean;
  form: BasicForm;
  onForm: React.Dispatch<React.SetStateAction<BasicForm>>;
  onEdit: () => void; onCancelEdit: () => void; onSave: () => void;
  onBack: () => void;
}) {
  const inputCls = "w-36 px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white text-right focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:opacity-50";

  const readRow = (label: string, value: string) => (
    <li key={label} className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-xs text-gray-400 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-800 text-right truncate">{value}</span>
    </li>
  );

  return (
    <div className="md:hidden fixed inset-0 z-[55] bg-white flex flex-col">
      <div className="flex-shrink-0 h-12 flex items-center justify-between px-2 border-b border-gray-100 bg-white">
        <div className="flex items-center">
          <button onClick={onBack} aria-label="Back" className="p-2 -ml-1 rounded-md text-gray-600 hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="ml-1 text-sm font-semibold text-gray-900">Basic Info</span>
        </div>
        {editing ? (
          <div className="flex items-center gap-1.5 pr-1">
            <button onClick={onCancelEdit} className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-gray-600">Cancel</button>
            <button onClick={onSave} className="flex items-center gap-1 text-xs px-2.5 py-1 bg-brand-500 text-white rounded-lg"><Check className="w-3 h-3" />Save</button>
          </div>
        ) : (
          <button onClick={onEdit} className="flex items-center gap-1 text-xs text-brand-600 font-medium px-2 py-1 mr-1"><Pencil className="w-3 h-3" />Edit</button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center gap-3 px-4 py-4 bg-gray-50 border-b border-gray-100">
          <img src={headshotUrl} alt={actor.name} className="w-14 h-14 rounded-full object-cover object-top ring-2 ring-white shadow-sm" />
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-gray-900 truncate">{actor.name}</p>
            <p className="text-xs text-gray-400 font-mono">{actor.ssoId}</p>
          </div>
          <StatusBadge status={status} />
        </div>
        <ul className="divide-y divide-gray-100">
          {readRow("SSO", actor.ssoId)}
          {readRow("Name", actor.name)}
          {/* Gender */}
          <li className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-xs text-gray-400 flex-shrink-0">Gender</span>
            {editing ? (
              <select value={form.gender} onChange={(e) => onForm((f) => ({ ...f, gender: e.target.value as "men" | "women" }))} className={inputCls}>
                <option value="men">Male</option><option value="women">Female</option>
              </select>
            ) : readRow("", actor.gender === "men" ? "Male" : actor.gender === "women" ? "Female" : "—").props.children[1]}
          </li>
          {/* Height */}
          <li className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-xs text-gray-400 flex-shrink-0">Height</span>
            {editing ? (
              <input type="number" value={form.height} onChange={(e) => onForm((f) => ({ ...f, height: e.target.value }))} className={inputCls} />
            ) : <span className="text-sm text-gray-800">{actor.height} cm</span>}
          </li>
          {/* Weight */}
          <li className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-xs text-gray-400 flex-shrink-0">Weight</span>
            {editing ? (
              <input type="number" value={form.weight} onChange={(e) => onForm((f) => ({ ...f, weight: e.target.value }))} className={inputCls} />
            ) : <span className="text-sm text-gray-800">{actor.weight} kg</span>}
          </li>
          {/* Voice Range */}
          <li className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-xs text-gray-400 flex-shrink-0">Voice Range</span>
            {editing ? (
              <select value={form.voiceRange} onChange={(e) => onForm((f) => ({ ...f, voiceRange: e.target.value }))} className={inputCls}>
                <option value="">—</option>
                {VOICE_RANGE_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            ) : <span className="text-sm text-gray-800 text-right truncate">{voiceRange || "—"}</span>}
          </li>
          {/* Nationality */}
          <li className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-xs text-gray-400 flex-shrink-0">Nationality</span>
            {editing ? (
              <select value={form.nationality} onChange={(e) => onForm((f) => ({ ...f, nationality: e.target.value }))} className={inputCls}>
                {ALL_NATIONALITIES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            ) : (
              <span className="text-sm text-gray-800 text-right truncate">{flag} {nationality}</span>
            )}
          </li>
          {/* Language */}
          <li className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-xs text-gray-400 flex-shrink-0">Language</span>
            {editing ? (
              <select value={form.language} onChange={(e) => onForm((f) => ({ ...f, language: e.target.value }))} className={inputCls}>
                <option value="">—</option>
                {LANGUAGE_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            ) : (
              <span className="text-sm text-gray-800 text-right truncate">{language || "—"}</span>
            )}
          </li>
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
  const today = new Date().toISOString().split("T")[0];
  const headshotInputRef = useRef<HTMLInputElement>(null);
  const [headshotUrl, setHeadshotUrl] = useState(actor.photoUrl);
  const { statusOf } = useActorStatus();
  const currentStatus = statusOf(actor);

  const [collapsed, setCollapsed] = useState({
    skills: false, attachment: false, showRole: false, event: false, fitting: false,
  });
  const toggle = (s: keyof typeof collapsed) => setCollapsed((p) => ({ ...p, [s]: !p[s] }));
  const [confirm, setConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const askConfirm = (title: string, message: string, onConfirm: () => void) =>
    setConfirm({ title, message, onConfirm });

  // ── Basic Info (all fields editable) ─────────────────────────────────────
  const [nationality, setNationality] = useState(actor.nationality);
  const [homeShow, setHomeShow] = useState(actor.homeShow ?? "");
  const [homeRole, setHomeRole] = useState(actor.homeRole ?? "");
  const flag = NATIONALITY_FLAGS[nationality] ?? actor.flag;
  const [editingBasic, setEditingBasic] = useState(false);
  const [basicForm, setBasicForm] = useState({
    nationality: actor.nationality,
    gender: actor.gender ?? "men",
    height: String(actor.height),
    weight: String(actor.weight),
    voiceRange: actor.voiceRange ?? "",
    language: actor.language ?? "",
  });
  const [voiceRange, setVoiceRange] = useState(actor.voiceRange ?? "");
  const [language, setLanguage] = useState(actor.language ?? "");
  function startEditBasic() {
    setBasicForm({ nationality, gender: actor.gender ?? "men", height: String(actor.height), weight: String(actor.weight), voiceRange, language });
    setEditingBasic(true);
  }

  // Inactivate dialog (Show & Role / Event / Fitting) carries an editable expiry date.
  const [inactivateTarget, setInactivateTarget] = useState<{ kind: "showRole" | "event" | "fitting"; id: string; label: string } | null>(null);

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

  // ── Show Photos section (photo gallery; titled "Show Photos" per 0527 spec) ──
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>(actor.mediaFiles ?? []);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [addingMedia, setAddingMedia] = useState(false);
  const [editingMediaIdx, setEditingMediaIdx] = useState<number | null>(null);
  const [mediaForm, setMediaForm] = useState<{ note: string; photographer: string; show: string; role: string; file: File | null; url: string; type: "photo" | "video" }>({
    note: "", photographer: "", show: "", role: "", file: null, url: "", type: "photo",
  });
  const portfolioInputRef = useRef<HTMLInputElement>(null);
  const mediaAddFormRoles = ALL_SHOWS.find((s) => s.name === mediaForm.show)?.roles ?? [];

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
    setMediaFiles((p) => [...p, { type: mediaForm.type, url: mediaForm.url, note: mediaForm.note, photographer: mediaForm.photographer, show: mediaForm.show, role: mediaForm.role }]);
    setMediaForm({ note: "", photographer: "", show: "", role: "", file: null, url: "", type: "photo" });
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

  // ── Fitting Record section ─────────────────────────────────────────────
  const [fittingRecords, setFittingRecords] = useState<FittingRecord[]>(actor.fittingRecords ?? []);

  const [addingShowRole, setAddingShowRole] = useState(false);
  const [showRoleForm, setShowRoleForm] = useState({ show: "", role: "", roleType: "home" as "home" | "swing", date: today });
  const showRoleFormRoles = ALL_SHOWS.find((s) => s.name === showRoleForm.show)?.roles ?? [];

  function saveShowRole() {
    if (!showRoleForm.show || !showRoleForm.role) { setAddingShowRole(false); return; }
    const isHome = showRoleForm.roleType === "home";
    const activeHome = showRoleRecords.find((r) => r.roleType === "home" && r.status === "active");
    const doSave = () => {
      setShowRoleRecords((p) => {
        const next = isHome && activeHome
          ? p.map((r) => r.id === activeHome.id ? { ...r, status: "inactive" as const, endDate: today } : r)
          : [...p];
        next.unshift({
          id: `sr-${Date.now()}`, show: showRoleForm.show, role: showRoleForm.role,
          roleType: showRoleForm.roleType, date: showRoleForm.date || today, status: "active",
        });
        setHomeShow(showRoleForm.show);
        setHomeRole(showRoleForm.role);
        return next;
      });
      setShowRoleForm({ show: "", role: "", roleType: "home", date: today });
      setAddingShowRole(false);
    };
    if (isHome && activeHome) {
      askConfirm(
        "Reassign Home Show & Role",
        `This performer already has an active Home Show & Role (${activeHome.show} / ${activeHome.role}). Adding a new Home will set the existing record to inactive. Continue?`,
        doSave,
      );
    } else {
      doSave();
    }
  }

  function cancelShowRole() {
    setShowRoleForm({ show: "", role: "", roleType: "home", date: today });
    setAddingShowRole(false);
  }

  const [addingEvent, setAddingEvent] = useState(false);
  const [eventForm, setEventForm] = useState({ eventName: "", roleName: "", date: today });
  const eventFormRoles = rolesForEvent(eventForm.eventName);

  function saveEvent() {
    if (!eventForm.eventName || !eventForm.roleName) { setAddingEvent(false); return; }
    setEventRecords((p) => [...p, {
      id: `ev-${Date.now()}`, eventName: eventForm.eventName, roleName: eventForm.roleName,
      startDate: eventForm.date || today, endDate: "", status: "active",
    }]);
    setEventForm({ eventName: "", roleName: "", date: today });
    setAddingEvent(false);
  }

  function cancelEvent() {
    setEventForm({ eventName: "", roleName: "", date: today });
    setAddingEvent(false);
  }

  const [addingFitting, setAddingFitting] = useState(false);
  const [fittingForm, setFittingForm] = useState({
    kind: "show" as "show" | "event",
    show: "", role: "", eventName: "", eventRole: "",
    result: "Suitable" as "Suitable" | "Not Suitable",
    date: today, note: "",
  });
  const fittingFormRoles = ALL_SHOWS.find((s) => s.name === fittingForm.show)?.roles ?? [];
  const fittingFormEventRoles = rolesForEvent(fittingForm.eventName);

  function saveFitting() {
    if (fittingForm.kind === "show" && (!fittingForm.show || !fittingForm.role)) { setAddingFitting(false); return; }
    if (fittingForm.kind === "event" && (!fittingForm.eventName || !fittingForm.eventRole)) { setAddingFitting(false); return; }
    setFittingRecords((p) => [...p, {
      id: `ft-${Date.now()}`,
      date: fittingForm.date || today,
      kind: fittingForm.kind,
      show: fittingForm.kind === "show" ? fittingForm.show : undefined,
      role: fittingForm.kind === "show" ? fittingForm.role : undefined,
      eventName: fittingForm.kind === "event" ? fittingForm.eventName : undefined,
      eventRole: fittingForm.kind === "event" ? fittingForm.eventRole : undefined,
      result: fittingForm.result,
      note: fittingForm.note || undefined,
      status: "active",
    }]);
    setFittingForm({ kind: "show", show: "", role: "", eventName: "", eventRole: "", result: "Suitable", date: today, note: "" });
    setAddingFitting(false);
  }

  function cancelFitting() {
    setFittingForm({ kind: "show", show: "", role: "", eventName: "", eventRole: "", result: "Suitable", date: today, note: "" });
    setAddingFitting(false);
  }

  function commitBasic() {
    const f = basicForm;
    setNationality(f.nationality);
    setVoiceRange(f.voiceRange);
    setLanguage(f.language);
    setEditingBasic(false);
  }

  // Apply an inactivation (Show & Role / Event) with the chosen expiry date.
  function commitInactivate(endDate: string) {
    if (!inactivateTarget) return;
    if (inactivateTarget.kind === "showRole") {
      setShowRoleRecords((p) => p.map((r) => r.id === inactivateTarget.id ? { ...r, status: "inactive", endDate } : r));
    } else if (inactivateTarget.kind === "event") {
      setEventRecords((p) => p.map((r) => r.id === inactivateTarget.id ? { ...r, status: "inactive", endDate } : r));
    } else {
      setFittingRecords((p) => p.map((r) => r.id === inactivateTarget.id ? { ...r, status: "inactive", endDate } : r));
    }
    setInactivateTarget(null);
  }

  const inputCls = "w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300";
  const labelCls = "block text-xs text-gray-400 mb-1";

  const activeShowRoleCount = showRoleRecords.filter((r) => r.status === "active").length;
  const activeEventCount = eventRecords.filter((r) => r.status === "active").length;
  const activeFittingCount = fittingRecords.filter((r) => r.status === "active").length;

  return (
    <>
      {lightboxIdx !== null && (
        <Lightbox files={mediaFiles} initialIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
      {editingMediaIdx !== null && (
        <PhotoMetaEditModal
          file={mediaFiles[editingMediaIdx]}
          onSave={(updates) => setMediaFiles((p) => p.map((f, i) => i === editingMediaIdx ? { ...f, ...updates } : f))}
          onClose={() => setEditingMediaIdx(null)}
        />
      )}
      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          onCancel={() => setConfirm(null)}
          onConfirm={() => { confirm.onConfirm(); setConfirm(null); }}
        />
      )}
      {inactivateTarget && (
        <InactivateDialog label={inactivateTarget.label} defaultDate={today}
          onCancel={() => setInactivateTarget(null)} onConfirm={commitInactivate} />
      )}
      <input ref={headshotInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setHeadshotUrl(URL.createObjectURL(f));
          e.target.value = "";
        }} />
      {section === "basic" && (
        <BasicInfoMobile
          actor={actor} headshotUrl={headshotUrl} status={currentStatus}
          nationality={nationality} flag={flag} voiceRange={voiceRange} language={language}
          editing={editingBasic} form={basicForm} onForm={setBasicForm}
          onEdit={startEditBasic} onCancelEdit={() => setEditingBasic(false)} onSave={commitBasic}
          onBack={() => onOpenSection(null)} />
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
                {(homeShow || "—")} <span className="text-gray-300 mx-0.5">&amp;</span> {(homeRole || "—")}
              </p>
              <p className="text-xs text-gray-500">
                {actor.height} cm / {actor.weight} kg
              </p>
              <span className="inline-flex self-start mt-0.5">
                <StatusBadge status={currentStatus} />
              </span>
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
              <span className="hidden md:inline-flex flex-shrink-0">
                <StatusBadge status={currentStatus} />
              </span>
            </div>
          </div>
        </div>

        {/* Nationality accent strip (desktop only; read-only — edit via Basic Info) */}
        <div className="hidden md:flex flex-shrink-0 px-5 py-2.5 bg-brand-50 border-b border-brand-100 items-center gap-2 min-w-0">
          <span className="text-[10px] uppercase tracking-wide text-brand-600 font-semibold flex-shrink-0">Nationality</span>
          <span className="text-sm font-bold text-brand-700 truncate">
            {flag} {nationality}
          </span>
        </div>

        {/* Basic Info header bar (desktop) — Edit/Save/Cancel */}
        <div className="hidden md:flex flex-shrink-0 items-center justify-between px-5 py-1.5 border-b border-gray-100">
          <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Basic Info</span>
          {editingBasic ? (
            <div className="flex items-center gap-1.5">
              <button onClick={() => setEditingBasic(false)} className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={commitBasic} className="flex items-center gap-1 text-xs px-2.5 py-1 bg-brand-500 text-white rounded-lg hover:bg-brand-600"><Check className="w-3 h-3" />Save</button>
            </div>
          ) : (
            <button onClick={startEditBasic} className="flex items-center gap-1 text-xs text-brand-600 font-medium px-1 py-1 hover:text-brand-700"><Pencil className="w-3 h-3" />Edit</button>
          )}
        </div>

        {/* Basic Info — desktop row: SSO / Gender / Language / Height / Weight / Voice Range */}
        <div className="hidden md:grid flex-shrink-0 grid-cols-6 border-b border-gray-100">
          {[
            { label: "SSO", value: actor.ssoId, mono: true },
          ].map(({ label, value, mono }) => (
            <div key={label} className="px-2 py-2.5 text-center border-r border-gray-100">
              <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
              <p className={`text-[11px] font-semibold text-gray-800 leading-snug truncate ${mono ? "font-mono" : ""}`}>{value}</p>
            </div>
          ))}
          <div className="px-2 py-2.5 text-center border-r border-gray-100">
            <p className="text-[10px] text-gray-400 mb-0.5">Gender</p>
            {editingBasic ? (
              <select value={basicForm.gender} onChange={(e) => setBasicForm((f) => ({ ...f, gender: e.target.value as "men" | "women" }))}
                className="w-full text-[11px] px-1 py-0.5 border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-brand-200">
                <option value="men">Male</option><option value="women">Female</option>
              </select>
            ) : (
              <p className="text-[11px] font-semibold text-gray-800">{actor.gender === "men" ? "Male" : actor.gender === "women" ? "Female" : "—"}</p>
            )}
          </div>
          <div className="px-2 py-2.5 text-center border-r border-gray-100">
            <p className="text-[10px] text-gray-400 mb-0.5">Language</p>
            {editingBasic ? (
              <select value={basicForm.language} onChange={(e) => setBasicForm((f) => ({ ...f, language: e.target.value }))}
                className="w-full text-[11px] px-1 py-0.5 border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-brand-200">
                <option value="">—</option>
                {LANGUAGE_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            ) : (
              <p className="text-[11px] font-semibold text-gray-800 truncate">{language || "—"}</p>
            )}
          </div>
          <div className="px-2 py-2.5 text-center border-r border-gray-100">
            <p className="text-[10px] text-gray-400 mb-0.5">Height</p>
            {editingBasic ? (
              <input type="number" value={basicForm.height} onChange={(e) => setBasicForm((f) => ({ ...f, height: e.target.value }))}
                className="w-full text-[11px] px-1 py-0.5 border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-brand-200 text-center" />
            ) : (
              <p className="text-[11px] font-semibold text-gray-800">{actor.height} cm</p>
            )}
          </div>
          <div className="px-2 py-2.5 text-center border-r border-gray-100">
            <p className="text-[10px] text-gray-400 mb-0.5">Weight</p>
            {editingBasic ? (
              <input type="number" value={basicForm.weight} onChange={(e) => setBasicForm((f) => ({ ...f, weight: e.target.value }))}
                className="w-full text-[11px] px-1 py-0.5 border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-brand-200 text-center" />
            ) : (
              <p className="text-[11px] font-semibold text-gray-800">{actor.weight} kg</p>
            )}
          </div>
          <div className="px-2 py-2.5 text-center">
            <p className="text-[10px] text-gray-400 mb-0.5">Voice Range</p>
            {editingBasic ? (
              <select value={basicForm.voiceRange} onChange={(e) => setBasicForm((f) => ({ ...f, voiceRange: e.target.value }))}
                className="w-full text-[11px] px-1 py-0.5 border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-brand-200">
                <option value="">—</option>
                {VOICE_RANGE_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            ) : (
              <p className="text-[11px] font-semibold text-gray-800 truncate">{voiceRange || "—"}</p>
            )}
          </div>
        </div>

        {/* Scrollable sections */}
        <div className="flex-1 overflow-y-auto flex flex-col">

          {/* ── Skillset ── */}
          <div className="md:border-b md:border-gray-100" style={{ order: 4 }}>
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
          <div className="border-b border-gray-100" style={{ order: 5 }}>
            <input ref={portfolioInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handlePortfolioPick} />
            <SectionHeader
              title="Show Photos" count={mediaFiles.length}
              editing={addingMedia} collapsed={collapsed.attachment}
              onToggleCollapse={() => toggle("attachment")}
              onAdd={() => setAddingMedia(true)} addLabel="Add"
              onCancel={() => { setAddingMedia(false); setMediaForm({ note: "", photographer: "", show: "", role: "", file: null, url: "", type: "photo" }); }}
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
                      <label className={labelCls}>Photographer (optional)</label>
                      <input value={mediaForm.photographer ?? ""} onChange={(e) => setMediaForm((p) => ({ ...p, photographer: e.target.value }))}
                        className={inputCls} placeholder="Photographer name" />
                    </div>
                    <div>
                      <label className={labelCls}>Show (optional)</label>
                      <select value={mediaForm.show ?? ""} onChange={(e) => setMediaForm((p) => ({ ...p, show: e.target.value, role: "" }))}
                        className={inputCls + " bg-white"}>
                        <option value="">Select show</option>
                        {ALL_SHOWS.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Role (optional)</label>
                      <select value={mediaForm.role ?? ""} onChange={(e) => setMediaForm((p) => ({ ...p, role: e.target.value }))}
                        disabled={!mediaForm.show} className={inputCls + " bg-white disabled:opacity-50"}>
                        <option value="">Select role</option>
                        {mediaAddFormRoles.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
                      </select>
                    </div>
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
                          <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover/media:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); setEditingMediaIdx(i); }}
                              className="w-5 h-5 bg-brand-500 hover:bg-brand-600 rounded-full flex items-center justify-center text-white">
                              <Pencil className="w-3 h-3" />
                            </button>
                            <a href={f.url} download={`photo_${i + 1}.jpg`}
                              className="w-5 h-5 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center text-white"
                              onClick={(e) => e.stopPropagation()}>
                              <Download className="w-3 h-3" />
                            </a>
                            <button onClick={() => askConfirm("Remove photo", "Remove this photo from Show Photos?",
                              () => setMediaFiles((p) => p.filter((_, idx) => idx !== i)))}
                              className="w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        {(f.note || f.photographer || f.show || f.role) && (
                          <div className="mt-1 space-y-0.5">
                            {(f.show || f.role) && <p className="text-[10px] text-brand-600 font-medium">{[f.show, f.role].filter(Boolean).join(" / ")}</p>}
                            {f.photographer && <p className="text-[10px] text-gray-400">📷 {f.photographer}</p>}
                            {f.note && <p className="text-[10px] text-gray-400 line-clamp-1">{f.note}</p>}
                          </div>
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
                          askConfirm("Remove photo", "This photo will be removed from Show Photos. Continue?",
                            () => setMediaFiles((p) => p.filter((_, idx) => idx !== i)));
                        }}
                        aria-label="Remove media"
                        className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setEditingMediaIdx(i); }}
                        aria-label="Edit photo info"
                        className="absolute bottom-1 left-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white"
                      >
                        <Pencil className="w-3 h-3" />
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
          <div className="border-b border-gray-100" style={{ order: 1 }}>
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
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                      <div>
                        <label className={labelCls}>Effective Date</label>
                        <input type="date" value={showRoleForm.date}
                          onChange={(e) => setShowRoleForm((f) => ({ ...f, date: e.target.value }))}
                          className={inputCls + " bg-white"} />
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
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {inactive ? (
                              <span className="text-xs text-gray-300">Inactive</span>
                            ) : (
                              <button onClick={() => setInactivateTarget({ kind: "showRole", id: rec.id, label: `${rec.show} / ${rec.role}` })}
                                className="text-xs text-amber-500 hover:text-amber-700 transition-colors">Set inactive</button>
                            )}
                            <button onClick={() => askConfirm("Delete Record", `Delete "${rec.show} / ${rec.role}"?`,
                              () => setShowRoleRecords((p) => p.filter((x) => x.id !== rec.id)))}
                              className="p-0.5 text-gray-300 hover:text-red-500 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        {(rec.date && rec.date !== "—") || rec.endDate ? (
                          <p className="mt-1 text-[10px] text-gray-400">
                            {rec.date && rec.date !== "—" ? `Effective ${rec.date}` : ""}
                            {rec.endDate ? `${rec.date && rec.date !== "—" ? " · " : ""}Expired ${rec.endDate}` : ""}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* ── Event Experience ── */}
          <div className="border-b border-gray-100" style={{ order: 2 }}>
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className={labelCls}>Event Name</label>
                        <select value={eventForm.eventName}
                          onChange={(e) => setEventForm((f) => ({ ...f, eventName: e.target.value, roleName: "" }))}
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
                      <div>
                        <label className={labelCls}>Effective Date</label>
                        <input type="date" value={eventForm.date}
                          onChange={(e) => setEventForm((f) => ({ ...f, date: e.target.value }))}
                          className={inputCls + " bg-white"} />
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
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {inactive ? (
                            <span className="text-xs text-gray-300">Inactive</span>
                          ) : (
                            <button onClick={() => setInactivateTarget({ kind: "event", id: rec.id, label: `${rec.eventName} & ${rec.roleName}` })}
                              className="text-xs text-amber-500 hover:text-amber-700 transition-colors">Set inactive</button>
                          )}
                          <button onClick={() => askConfirm("Delete Record", `Delete "${rec.eventName} — ${rec.roleName}"?`,
                            () => setEventRecords((p) => p.filter((x) => x.id !== rec.id)))}
                            className="p-0.5 text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {rec.startDate || rec.endDate ? (
                        <p className="mt-1 text-[10px] text-gray-400">
                          {rec.startDate ? `Effective ${rec.startDate}` : ""}
                          {rec.endDate ? `${rec.startDate ? " · " : ""}Expired ${rec.endDate}` : ""}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Fitting Record ── */}
          <div className="border-b border-gray-100" style={{ order: 3 }}>
            <SectionHeader
              title="Fitting Record" count={activeFittingCount}
              editing={addingFitting} collapsed={collapsed.fitting}
              onToggleCollapse={() => toggle("fitting")}
              onAdd={() => setAddingFitting(true)} addLabel="Add"
              onCancel={cancelFitting}
              onSave={saveFitting}
            />
            {!collapsed.fitting && (
              <div className="px-5 pb-4 space-y-2">
                {addingFitting && (
                  <div className="p-3 bg-brand-50 rounded-xl border border-brand-100 space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <label className={labelCls}>Type</label>
                        <select value={fittingForm.kind}
                          onChange={(e) => setFittingForm((f) => ({ ...f, kind: e.target.value as "show" | "event", show: "", role: "", eventName: "", eventRole: "" }))}
                          className={inputCls + " bg-white"}>
                          <option value="show">Show &amp; Role</option>
                          <option value="event">Event</option>
                        </select>
                      </div>
                      {fittingForm.kind === "show" ? (
                        <>
                          <div>
                            <label className={labelCls}>Show</label>
                            <select value={fittingForm.show}
                              onChange={(e) => setFittingForm((f) => ({ ...f, show: e.target.value, role: "" }))}
                              className={inputCls + " bg-white"}>
                              <option value="">Select show</option>
                              {ALL_SHOWS.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className={labelCls}>Role</label>
                            <select value={fittingForm.role}
                              onChange={(e) => setFittingForm((f) => ({ ...f, role: e.target.value }))}
                              disabled={!fittingForm.show}
                              className={inputCls + " bg-white disabled:opacity-50"}>
                              <option value="">Select role</option>
                              {fittingFormRoles.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
                            </select>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <label className={labelCls}>Event Name</label>
                            <select value={fittingForm.eventName}
                              onChange={(e) => setFittingForm((f) => ({ ...f, eventName: e.target.value, eventRole: "" }))}
                              className={inputCls + " bg-white"}>
                              <option value="">Select event</option>
                              {EVENT_NAME_LIST.map((n) => <option key={n} value={n}>{n}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className={labelCls}>Role Name</label>
                            <select value={fittingForm.eventRole}
                              onChange={(e) => setFittingForm((f) => ({ ...f, eventRole: e.target.value }))}
                              disabled={!fittingForm.eventName}
                              className={inputCls + " bg-white disabled:opacity-50"}>
                              <option value="">Select role</option>
                              {fittingFormEventRoles.map((r) => <option key={r} value={r}>{r}</option>)}
                            </select>
                          </div>
                        </>
                      )}
                      <div>
                        <label className={labelCls}>Fitting Date</label>
                        <input type="date" value={fittingForm.date}
                          onChange={(e) => setFittingForm((f) => ({ ...f, date: e.target.value }))}
                          className={inputCls + " bg-white"} />
                      </div>
                      <div>
                        <label className={labelCls}>Result</label>
                        <select value={fittingForm.result}
                          onChange={(e) => setFittingForm((f) => ({ ...f, result: e.target.value as "Suitable" | "Not Suitable" }))}
                          className={inputCls + " bg-white"}>
                          <option value="Suitable">Suitable</option>
                          <option value="Not Suitable">Not Suitable</option>
                        </select>
                      </div>
                      <div className="col-span-2 sm:col-span-2">
                        <label className={labelCls}>Note</label>
                        <input type="text" value={fittingForm.note}
                          onChange={(e) => setFittingForm((f) => ({ ...f, note: e.target.value }))}
                          className={inputCls + " bg-white"} />
                      </div>
                    </div>
                  </div>
                )}
                {fittingRecords.length === 0 && !addingFitting ? (
                  <p className="text-xs text-gray-300 py-3 text-center">No fitting records</p>
                ) : null}
                {fittingRecords.map((rec) => {
                  const inactive = rec.status === "inactive";
                  const label = rec.kind === "show" ? `${rec.show} / ${rec.role}` : `${rec.eventName} & ${rec.eventRole}`;
                  return (
                    <div key={rec.id} className={`p-3 rounded-xl border ${inactive ? "border-gray-100 opacity-40" : "border-gray-200"}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                          <span className="text-xs font-semibold text-gray-900 truncate">{label}</span>
                          <span className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${rec.result === "Suitable" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                            {rec.result}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {inactive ? (
                            <span className="text-xs text-gray-300">Inactive</span>
                          ) : (
                            <button onClick={() => setInactivateTarget({ kind: "fitting", id: rec.id, label })}
                              className="text-xs text-amber-500 hover:text-amber-700 transition-colors">Set inactive</button>
                          )}
                          <button onClick={() => askConfirm("Delete Record", `Delete fitting record "${label}"?`,
                            () => setFittingRecords((p) => p.filter((x) => x.id !== rec.id)))}
                            className="p-0.5 text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="mt-1 text-[10px] text-gray-400">
                        Fitting date {rec.date}
                        {rec.endDate ? ` · Expired ${rec.endDate}` : ""}
                      </p>
                      {rec.note ? <p className="mt-1 text-xs text-gray-600">{rec.note}</p> : null}
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

// ── Import Performers ─────────────────────────────────────────────────────
// Fields: SSO (optional), Name*, Nationality*, Gender*, Height*, Weight*, Voice Range (optional)
// No SSO → auto-assign 6xxxxxxx starting from 60000001.
// Rehire: if SSO exists and status ≠ Employed, prompt to reactivate.
const PERFORMER_IMPORT_COLUMNS: ImportColumn[] = [
  { key: "SSO", required: false, hint: "Leave blank to auto-assign a 6-prefix ID" },
  { key: "Full Name", required: true },
  { key: "Nationality", required: true },
  { key: "Gender", required: true },
  { key: "Height (cm)", required: true },
  { key: "Weight (kg)", required: true },
  { key: "Voice Range", required: false },
  { key: "Home Show", required: false },
  { key: "Home Role", required: false },
];

function RosterImportModal({ onClose, onCommit }: { onClose: () => void; onCommit?: (rows: string[][]) => void }) {
  return (
    <ExcelImportModal
      title="Import Performers"
      subtitle="Onboard performers in bulk (PC only)"
      columns={PERFORMER_IMPORT_COLUMNS}
      sample={["20017233", "Arthur William Bennett", "UK", "Male", "178", "72", "Tenor", "UOP", "Dragon Dance"]}
      fileBaseName="performer_import"
      hint={<>{" "}Default status: Employed. SSO blank → auto-assigned 6-prefix ID from 60000001. If duplicate SSO exists and is not Employed, you will be prompted to confirm rehire.</>}
      validateRow={(row) => {
        const sso = String(row[0] ?? "").trim();
        if (sso && !/^[26]\d{7}$/.test(sso)) return "SSO must be 8 digits starting with 2 or 6";
        if (!String(row[1] ?? "").trim()) return "Full Name is required";
        if (!String(row[2] ?? "").trim()) return "Nationality is required";
        return null;
      }}
      onImport={(rows) => onCommit?.(rows)}
      onClose={onClose}
    />
  );
}

// ── Import Event Experience ────────────────────────────────────────────────
const EVENT_IMPORT_COLUMNS: ImportColumn[] = [
  { key: "SSO", required: true },
  { key: "Event Name", required: true },
  { key: "Role Name", required: true },
  { key: "Start Date", required: false },
  { key: "End Date", required: false },
];

function ImportEventExperienceModal({ onClose }: { onClose: () => void }) {
  return (
    <ExcelImportModal
      title="Import Event Experience"
      subtitle="Bulk import event experience records"
      columns={EVENT_IMPORT_COLUMNS}
      sample={["20017233", "2025 Hua Pi", "狐妖", "2025-10-01", "2025-10-31"]}
      fileBaseName="event_experience_import"
      onClose={onClose}
    />
  );
}

// ── Import Show & Role ────────────────────────────────────────────────────
const SHOW_ROLE_IMPORT_COLUMNS: ImportColumn[] = [
  { key: "SSO", required: true },
  { key: "Show", required: true },
  { key: "Role", required: true },
  { key: "Type", required: true, hint: "Home or Swing" },
  { key: "Effective Date", required: false },
];

function ImportShowRoleModal({ onClose }: { onClose: () => void }) {
  return (
    <ExcelImportModal
      title="Import Show & Role"
      subtitle="Bulk import show & role assignments (Home or Swing)"
      columns={SHOW_ROLE_IMPORT_COLUMNS}
      sample={["20017233", "UCHMMG", "Frog Choir", "Home", "2025-06-01"]}
      fileBaseName="show_role_import"
      hint={<>{" "}Type must be <strong>Home</strong> or <strong>Swing</strong>. If importing a Home record and the performer already has an active Home, the existing one will be set to inactive.</>}
      validateRow={(row) => {
        const type = String(row[3] ?? "").trim();
        if (!["Home", "Swing"].includes(type)) return "Type must be Home or Swing";
        return null;
      }}
      onClose={onClose}
    />
  );
}

// ── Import Headshot ────────────────────────────────────────────────────────
function ImportHeadshotModal({ onClose }: { onClose: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<{ name: string; sso: string; url: string }[]>([]);

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    const parsed = picked.map((f) => {
      const sso = f.name.split("_")[0];
      return { name: f.name, sso, url: URL.createObjectURL(f) };
    });
    setFiles(parsed);
    e.target.value = "";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[92vw] max-w-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Import Headshots</h2>
            <p className="text-xs text-gray-400 mt-0.5">Batch upload headshot photos matched by filename prefix.</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-5 sm:px-6 py-4 space-y-4 overflow-y-auto">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-700">
            <strong>Naming convention:</strong> Files must be named <code className="bg-amber-100 px-1 rounded">SSO_description.jpg</code> (e.g. <code className="bg-amber-100 px-1 rounded">20017233_stage.jpg</code>). The part before the first <code className="bg-amber-100 px-1 rounded">_</code> is used to match the performer by SSO.
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
          <div onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl h-24 flex flex-col items-center justify-center gap-2 text-gray-300 hover:border-brand-300 hover:text-brand-400 cursor-pointer transition-colors">
            <Upload className="w-6 h-6" />
            <span className="text-sm font-medium">Click to select photos</span>
          </div>
          {files.length > 0 && (
            <div className="overflow-auto rounded-xl border border-gray-100 max-h-56">
              <table className="w-full text-xs">
                <thead className="text-[10px] uppercase text-gray-400 border-b border-gray-100 bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2">File</th>
                    <th className="text-left px-3 py-2">Matched SSO</th>
                    <th className="text-left px-3 py-2">Preview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {files.map((f) => (
                    <tr key={f.name}>
                      <td className="px-3 py-2 text-gray-700 font-mono">{f.name}</td>
                      <td className="px-3 py-2 font-mono text-brand-600">{f.sso}</td>
                      <td className="px-3 py-2">
                        <img src={f.url} alt="" className="w-8 h-8 rounded object-cover" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 sm:px-6 pb-5 pt-3 border-t border-gray-50">
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={onClose} disabled={files.length === 0}
            className="px-5 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 disabled:opacity-40">
            Import {files.length > 0 ? `(${files.length})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Update Basic Info Import ───────────────────────────────────────────────
const UPDATE_BASIC_COLUMNS: ImportColumn[] = [
  { key: "SSO", required: true },
  { key: "Nationality", required: false },
  { key: "Gender", required: false },
  { key: "Height (cm)", required: false },
  { key: "Weight (kg)", required: false },
  { key: "Voice Range", required: false },
];

function UpdateBasicInfoModal({ onClose }: { onClose: () => void }) {
  return (
    <ExcelImportModal
      title="Update Basic Info"
      subtitle="Update existing performers' basic info in bulk (PC only)"
      columns={UPDATE_BASIC_COLUMNS}
      sample={["20017233", "UK", "Male", "178", "72", "Tenor"]}
      fileBaseName="update_basic_info"
      hint={<>{" "}Matched by SSO. Non-empty cells overwrite; blanks leave existing values unchanged.</>}
      validateRow={(row) => {
        const sso = String(row[0] ?? "").trim();
        if (!VALID_SSO.test(sso)) return "SSO must be an 8-digit number starting with 2";
        return null;
      }}
      onClose={onClose}
    />
  );
}

// ── Replace SSO ─────────────────────────────────────────────────────────────
// Lists performers whose SSO starts with 6 (auto-generated on import without
// a real company SSO). The user provides replacement 2-starting 8-digit SSOs.
const AUTO_SSO = /^6\d{7}$/;
const VALID_SSO = /^2\d{7}$/;

function SsoReplacementModal({ onClose }: { onClose: () => void }) {
  const importRef = useRef<HTMLInputElement>(null);
  const invalidActors = useMemo(() => ALL_ACTORS_BY_SSO.filter((a) => AUTO_SSO.test(a.ssoId)), []);
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [saved, setSaved] = useState<Set<number>>(new Set());

  function downloadTemplate() {
    const header = ["Old SSO", "Name", "Gender", "New SSO *"];
    const rows = invalidActors.map((a) => [
      a.ssoId, a.name,
      a.gender === "men" ? "Male" : a.gender === "women" ? "Female" : "",
      "",
    ]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "replace_sso");
    XLSX.writeFile(wb, "replace_sso_template.xlsx");
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = (XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 }) as string[][]).slice(1);
      setEdits((prev) => {
        const next = { ...prev };
        rows.forEach((row) => {
          const oldSso = String(row[0] ?? "").trim();
          const newSso = String(row[1] ?? "").trim();
          const actor = invalidActors.find((a) => a.ssoId === oldSso);
          if (actor && newSso) next[actor.id] = newSso;
        });
        return next;
      });
    };
    reader.readAsBinaryString(f);
    e.target.value = "";
  }

  function saveAll() {
    setSaved((prev) => {
      const next = new Set(prev);
      invalidActors.forEach((a) => {
        if (VALID_SSO.test((edits[a.id] ?? "").trim())) next.add(a.id);
      });
      return next;
    });
  }

  const pending = invalidActors.filter((a) => !saved.has(a.id));
  const readyCount = pending.filter((a) => VALID_SSO.test((edits[a.id] ?? "").trim())).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[92vw] max-w-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Replace SSO</h2>
            <p className="text-xs text-gray-400 mt-0.5">Performers with auto-generated SSOs (starting with 3) awaiting real company SSO assignment.</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-5 sm:px-6 py-4 sm:py-5 space-y-4 overflow-y-auto">
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
            <FileSpreadsheet className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <p className="flex-1 text-xs text-blue-600">
              Edit each row inline, or download the template (prefilled with old SSOs) and re-import to fill new SSOs in bulk.
            </p>
            <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
            <button onClick={() => importRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-50 transition-colors flex-shrink-0">
              <Upload className="w-3.5 h-3.5" />Import
            </button>
            <button onClick={downloadTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors flex-shrink-0">
              <Download className="w-3.5 h-3.5" />Template
            </button>
          </div>

          {invalidActors.length === 0 ? (
            <p className="text-sm text-gray-300 py-8 text-center">No performers with auto-generated SSOs.</p>
          ) : (
            <div className="overflow-auto rounded-xl border border-gray-100">
              <table className="w-full text-xs">
                <thead className="text-[10px] uppercase text-gray-400 border-b border-gray-100 bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2">Old SSO</th>
                    <th className="text-left px-3 py-2">Name</th>
                    <th className="text-left px-3 py-2">Gender</th>
                    <th className="text-left px-3 py-2 w-44">New SSO</th>
                    <th className="px-2 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {invalidActors.map((a) => {
                    const val = edits[a.id] ?? "";
                    const isSaved = saved.has(a.id);
                    const valid = VALID_SSO.test(val.trim());
                    return (
                      <tr key={a.id} className={isSaved ? "bg-emerald-50/40" : ""}>
                        <td className="px-3 py-2 font-mono text-gray-400 whitespace-nowrap">{a.ssoId}</td>
                        <td className="px-3 py-2 text-gray-800 whitespace-nowrap">{a.name}</td>
                        <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{a.gender === "men" ? "Male" : a.gender === "women" ? "Female" : "—"}</td>
                        <td className="px-3 py-2">
                          {isSaved ? (
                            <span className="font-mono text-emerald-600 font-medium">{val}</span>
                          ) : (
                            <input value={val} onChange={(e) => setEdits((p) => ({ ...p, [a.id]: e.target.value }))}
                              placeholder="2xxxxxxx"
                              className={`h-8 px-2 border rounded-lg text-xs font-mono w-full focus:outline-none focus:ring-2 ${val && !valid ? "border-red-300 focus:ring-red-200" : "border-gray-200 focus:ring-brand-200"}`} />
                          )}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {isSaved && <Check className="w-4 h-4 text-emerald-500 inline" />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 px-5 sm:px-6 pb-5 pt-3 border-t border-gray-50">
          <span className="text-xs text-gray-400">{pending.length} pending · {saved.size} replaced</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">Close</button>
            <button onClick={saveAll} disabled={readyCount === 0}
              className="px-5 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 disabled:opacity-40 transition-colors">
              Save {readyCount > 0 ? readyCount : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Terminate Dialog ──────────────────────────────────────────────────────
function OffBoardDialog({ onClose }: { onClose: () => void }) {
  const { setStatusFor, statusOf } = useActorStatus();
  const [raw, setRaw] = useState("");
  const [loaded, setLoaded] = useState<{ matched: Actor[]; unmatched: string[] } | null>(null);

  function loadList() {
    const tokens = [...new Set(raw.split(/[\s,;]+/).map((t) => t.trim()).filter(Boolean))];
    const matched: Actor[] = [];
    const unmatched: string[] = [];
    tokens.forEach((sso) => {
      const a = ALL_ACTORS_BY_SSO.find((x) => x.ssoId === sso);
      if (a) matched.push(a); else unmatched.push(sso);
    });
    setLoaded({ matched, unmatched });
  }

  function confirmTerminate() {
    if (!loaded || loaded.matched.length === 0) return;
    setStatusFor(loaded.matched.map((a) => a.id), "Terminated");
    onClose();
  }

  const toTerminate = loaded?.matched.filter((a) => statusOf(a) !== "Terminated") ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[92vw] max-w-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Terminate Performers</h2>
            <p className="text-xs text-gray-400 mt-0.5">Paste one or more SSOs (space, comma, or new line separated) then confirm.</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 transition-colors"><X className="w-5 h-5" /></button>
        </div>

        {!loaded ? (
          <>
            <div className="px-5 sm:px-6 py-4 sm:py-5 overflow-y-auto">
              <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={6}
                placeholder={"20017233\n20018021\n20019044"}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-200" />
            </div>
            <div className="flex justify-end gap-2 px-5 sm:px-6 pb-5 pt-3 border-t border-gray-50">
              <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={loadList} disabled={!raw.trim()}
                className="px-5 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 disabled:opacity-40 transition-colors">Next</button>
            </div>
          </>
        ) : (
          <>
            <div className="px-5 sm:px-6 py-4 sm:py-5 space-y-3 overflow-y-auto">
              {loaded.matched.length === 0 ? (
                <p className="text-sm text-gray-300 py-6 text-center">No performers matched the SSOs entered.</p>
              ) : (
                <div className="overflow-auto rounded-xl border border-gray-100">
                  <table className="w-full text-xs">
                    <thead className="text-[10px] uppercase text-gray-400 border-b border-gray-100 bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2">SSO</th>
                        <th className="text-left px-3 py-2">Name</th>
                        <th className="text-left px-3 py-2">Nationality</th>
                        <th className="text-left px-3 py-2">Gender</th>
                        <th className="text-left px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {loaded.matched.map((a) => (
                        <tr key={a.id}>
                          <td className="px-3 py-2 font-mono text-gray-500 whitespace-nowrap">{a.ssoId}</td>
                          <td className="px-3 py-2 text-gray-800 whitespace-nowrap">{a.name}</td>
                          <td className="px-3 py-2 text-gray-600">{a.flag} {a.nationality}</td>
                          <td className="px-3 py-2 text-gray-600">{a.gender === "men" ? "Male" : a.gender === "women" ? "Female" : "—"}</td>
                          <td className="px-3 py-2"><StatusBadge status={statusOf(a)} size="xs" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {loaded.unmatched.length > 0 && (
                <p className="text-xs text-red-500">
                  {loaded.unmatched.length} SSO{loaded.unmatched.length === 1 ? "" : "s"} not found: <span className="font-mono">{loaded.unmatched.join(", ")}</span>
                </p>
              )}
            </div>
            <div className="flex justify-between gap-2 px-5 sm:px-6 pb-5 pt-3 border-t border-gray-50">
              <button onClick={() => setLoaded(null)} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">Back</button>
              <button onClick={confirmTerminate} disabled={toTerminate.length === 0}
                className="px-5 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 disabled:opacity-40 transition-colors">
                Confirm Terminate {toTerminate.length > 0 ? `(${toTerminate.length})` : ""}
              </button>
            </div>
          </>
        )}
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
  const [homeConflictConfirm, setHomeConflictConfirm] = useState<{ count: number; ids: number[] } | null>(null);

  const pool = useMemo(() => {
    const list = PERFORMERS.filter((p) => (p.status ?? "Employed") === "Employed");
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

  function handleAssign() {
    const ids = Array.from(picked);
    if (castType === "home") {
      const withHome = ids.filter((id) => {
        const p = PERFORMERS.find((x) => x.id === id);
        return !!p?.homeShow;
      });
      if (withHome.length > 0) {
        setHomeConflictConfirm({ count: withHome.length, ids });
        return;
      }
    }
    onSubmit(ids, castType);
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
              const hasHome = !!p.homeShow;
              return (
                <li key={p.id} className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${on ? "bg-brand-50/40" : "hover:bg-gray-50"}`}
                  onClick={() => togglePick(p.id)}>
                  <input type="checkbox" readOnly checked={on} className="accent-brand-500 w-3.5 h-3.5" />
                  <img src={p.photoUrl} alt="" className="w-7 h-7 rounded-full object-cover object-top" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-800 truncate">{p.name}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{p.ssoId}</p>
                  </div>
                  <span className={`text-[10px] truncate ${hasHome && castType === "home" ? "text-amber-500" : "text-gray-400"}`}>
                    {p.homeShow ? `${p.homeShow}/${p.homeRole}` : "Unassigned"}
                  </span>
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
      {homeConflictConfirm && (
        <ConfirmDialog
          title="Override Existing Home Role"
          message={`${homeConflictConfirm.count} selected performer${homeConflictConfirm.count === 1 ? " already has" : "s already have"} an active Home Show & Role. Assigning Home Cast here will replace their existing home assignment. Continue?`}
          confirmLabel="Assign Anyway"
          onConfirm={() => { setHomeConflictConfirm(null); onSubmit(homeConflictConfirm.ids, castType); }}
          onCancel={() => setHomeConflictConfirm(null)}
        />
      )}
      <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center bg-black/40 p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-[92vw] max-w-xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm sm:text-base">{title}</h2>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
          </div>
          <div className="px-5 sm:px-6 py-4 sm:py-5 overflow-y-auto">{body}</div>
          <div className="flex justify-end gap-2 px-5 sm:px-6 pb-5 pt-3 border-t border-gray-50">
            <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={handleAssign} disabled={picked.size === 0}
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
              <button onClick={handleAssign} disabled={picked.size === 0}
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

// ── Performer Card ─────────────────────────────────────────────────────────

function PerformerCard({ actor, onOpen, swing }: {
  actor: Actor; onOpen: (id: number) => void; swing?: boolean;
}) {
  return (
    <>
      <div className={`group relative bg-white rounded-xl overflow-hidden border shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 ${swing ? "border-2 border-emerald-400" : "border-gray-100"}`}>
        {swing && (
          <span className="absolute top-1.5 left-1.5 z-10 text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-700">
            Swing
          </span>
        )}
        <div className="relative w-full cursor-pointer" style={{ paddingBottom: "133%" }} onClick={() => onOpen(actor.id)}>
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

// ── Data Ops Menu ─────────────────────────────────────────────────────────

function DataOpsMenu({ onImportPerformers, onUpdateBasic, onReplaceSso, onImportEvent, onImportShowRole, onImportHeadshot }: {
  onImportPerformers: () => void; onUpdateBasic: () => void; onReplaceSso: () => void;
  onImportEvent: () => void; onImportShowRole: () => void; onImportHeadshot: () => void;
}) {
  const [open, setOpen] = useState(false);
  const item = (label: string, icon: React.ReactNode, fn: () => void) => (
    <button onClick={() => { setOpen(false); fn(); }}
      className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700 text-sm">
      {icon}{label}
    </button>
  );
  return (
    <div className="relative hidden md:block">
      <button onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1.5 h-9 px-3.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors">
        <Upload className="w-3.5 h-3.5" />Import <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 bg-white border border-gray-200 rounded-xl shadow-lg w-64 py-1">
            {item("Import Performers", <Upload className="w-3.5 h-3.5 text-gray-400" />, onImportPerformers)}
            {item("Update Basic Info", <Upload className="w-3.5 h-3.5 text-gray-400" />, onUpdateBasic)}
            {item("Import Event Experience", <Upload className="w-3.5 h-3.5 text-gray-400" />, onImportEvent)}
            {item("Import Show & Role", <Upload className="w-3.5 h-3.5 text-gray-400" />, onImportShowRole)}
            {item("Import Headshots", <Camera className="w-3.5 h-3.5 text-gray-400" />, onImportHeadshot)}
            <div className="my-1 border-t border-gray-100" />
            {item("Replace SSO", <Pencil className="w-3.5 h-3.5 text-gray-400" />, onReplaceSso)}
          </div>
        </>
      )}
    </div>
  );
}

// ── Card View ──────────────────────────────────────────────────────────────

type Scope =
  | { kind: "all" }
  | { kind: "showType"; type: string }
  | { kind: "show"; showId: string }
  | { kind: "role"; showId: string; roleId: string };

function getScopeActors(scope: Scope): { actor: Actor; swing: boolean }[] {
  switch (scope.kind) {
    case "all":
      return ALL_ACTORS_BY_SSO.map((actor) => ({ actor, swing: false }));
    case "showType":
      return ALL_ACTORS_BY_SSO
        .filter((actor) => showPerformanceType(actor.homeShow) === scope.type)
        .map((actor) => ({ actor, swing: false }));
    case "show": {
      const show = DATA.find((s) => s.id === scope.showId);
      return ALL_ACTORS_BY_SSO
        .filter((actor) => actor.homeShow === show?.name)
        .map((actor) => ({ actor, swing: false }));
    }
    case "role": {
      const show = DATA.find((s) => s.id === scope.showId);
      const role = show?.roles.find((r) => r.id === scope.roleId);
      if (!role) return [];
      return [
        ...role.homeActors.map((actor) => ({ actor, swing: false })),
        ...role.swingActors.map((actor) => ({ actor, swing: true })),
      ];
    }
  }
}

function CardView({
  scope, selectedCategory, onSelectCategory, onAssignPerformers, onTerminate, onOpenActor,
  onImportPerformers, onUpdateBasic, onReplaceSso, onImportEvent, onImportShowRole, onImportHeadshot,
}: {
  scope: Scope;
  selectedCategory: string;
  onSelectCategory: (c: string) => void;
  onAssignPerformers: () => void;
  onTerminate: () => void;
  onOpenActor: (id: number) => void;
  onImportPerformers: () => void; onUpdateBasic: () => void; onReplaceSso: () => void;
  onImportEvent: () => void; onImportShowRole: () => void; onImportHeadshot: () => void;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const { statusOf } = useActorStatus();
  const activeFilterCount = countActiveFilters(filters);

  function updateFilters(next: Filters) {
    setFilters(next);
    setPage(1);
  }

  const scopeItems = useMemo(() => getScopeActors(scope), [scope]);

  const categoriesPresent = useMemo(() => {
    if (scope.kind === "role") return [];
    const present = new Set(scopeItems.map(({ actor }) => actor.performerCategory).filter(Boolean));
    return PERFORMER_CATEGORIES.filter((c) => present.has(c));
  }, [scopeItems, scope.kind]);

  const categoryItems = selectedCategory === "All"
    ? scopeItems
    : scopeItems.filter(({ actor }) => actor.performerCategory === selectedCategory);

  const filteredItems = categoryItems.filter(({ actor }) => actorMatchesFilters(actor, filters, statusOf));

  const totalItems = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeP = Math.min(page, totalPages);
  const pageItems = filteredItems.slice((safeP - 1) * pageSize, safeP * pageSize);

  const show = scope.kind === "show" || scope.kind === "role" ? DATA.find((s) => s.id === scope.showId) ?? null : null;
  const role = scope.kind === "role" ? show?.roles.find((r) => r.id === scope.roleId) ?? null : null;

  let heading: React.ReactNode;
  let subtitle: string | null = null;
  if (scope.kind === "all") {
    heading = <h2 className="text-base sm:text-lg font-bold text-gray-900">All Performers</h2>;
    subtitle = `${totalItems} performers`;
  } else if (scope.kind === "showType") {
    heading = <h2 className="text-base sm:text-lg font-bold text-gray-900">{scope.type}</h2>;
    subtitle = `${totalItems} performers`;
  } else if (scope.kind === "show") {
    heading = (
      <div className="text-sm sm:text-base min-w-0">
        <span className="text-gray-500">{show?.performanceType}</span>
        <span className="text-gray-300 mx-2">/</span>
        <span className="text-gray-900 font-semibold">{show?.name}</span>
      </div>
    );
    subtitle = `${totalItems} performers`;
  } else {
    heading = (
      <div className="text-sm sm:text-base min-w-0">
        <span className="text-gray-500">{show?.performanceType}</span>
        <span className="text-gray-300 mx-2">/</span>
        <span className="text-gray-500">{show?.name}</span>
        <span className="text-gray-300 mx-2">/</span>
        <span className="text-gray-900 font-semibold">{role?.name}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-4 sm:pt-5 pb-4">
        {/* Breadcrumb / Title + Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="min-w-0">
            {heading}
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setShowFilter((p) => !p)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${showFilter ? "bg-brand-50 border-brand-300 text-brand-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
              <Filter className="w-4 h-4" />Filter
              {activeFilterCount > 0 && <span className="text-[10px] bg-brand-500 text-white rounded-full px-1.5 py-0.5">{activeFilterCount}</span>}
            </button>
            {scope.kind === "role" && (
              <button onClick={onAssignPerformers}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors shadow-sm">
                <Users className="w-4 h-4" />Assign Performers
              </button>
            )}
            <button onClick={onTerminate}
              className="flex items-center gap-1.5 px-3 py-2 border border-rose-200 text-rose-600 rounded-xl text-sm font-medium hover:bg-rose-50 transition-colors">
              <UserX className="w-4 h-4" />Terminate
            </button>
            <DataOpsMenu onImportPerformers={onImportPerformers} onUpdateBasic={onUpdateBasic} onReplaceSso={onReplaceSso} onImportEvent={onImportEvent} onImportShowRole={onImportShowRole} onImportHeadshot={onImportHeadshot} />
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
          <BottomSheet open={showFilter} onClose={() => setShowFilter(false)} title="Filter"
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

        {/* Performer Category tabs — hidden for a single Role scope */}
        {scope.kind !== "role" && categoriesPresent.length > 0 && (
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl w-fit mb-5 overflow-x-auto max-w-full">
            {["All", ...categoriesPresent].map((c) => (
              <button key={c} onClick={() => { onSelectCategory(c); setPage(1); }}
                className={`flex-shrink-0 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedCategory === c ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                {c}
              </button>
            ))}
          </div>
        )}

        {totalItems === 0 ? (
          <p className="text-sm text-gray-300 py-8 text-center">No performers match the filters</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {pageItems.map(({ actor, swing }) => (
              <PerformerCard key={actor.id} actor={actor} onOpen={onOpenActor} swing={swing} />
            ))}
          </div>
        )}
      </div>
      {totalPages > 1 && (
        <Paginator page={safeP} totalPages={totalPages} pageSize={pageSize} pageSizeOptions={[12, 24, 48]}
          totalItems={totalItems} onPageChange={setPage} onPageSizeChange={setPageSize} />
      )}
    </div>
  );
}

// ── Left Sidebar ───────────────────────────────────────────────────────────
// Tree: All Performers → Show Type → Show → Role

function LeftSidebar({
  scope, onSelectScope,
  isMobileOpen, onClose,
}: {
  scope: Scope;
  onSelectScope: (scope: Scope) => void;
  isMobileOpen: boolean;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(() => new Set(PERFORMANCE_TYPES));
  const [expandedShows, setExpandedShows] = useState<Set<string>>(
    () => new Set(scope.kind === "show" || scope.kind === "role" ? [scope.showId] : []),
  );

  const matchesSearch = (text: string) => !search || text.toLowerCase().includes(search.toLowerCase());
  const toggle = (set: Set<string>, setFn: (fn: (p: Set<string>) => Set<string>) => void, key: string) =>
    setFn((p) => { const n = new Set(p); if (n.has(key)) n.delete(key); else n.add(key); return n; });

  const roleCount = (r: Role) => r.homeActors.length + r.swingActors.length;
  const showCount = (show: Show) => show.roles.reduce((s, r) => s + roleCount(r), 0);
  const typeCount = (type: string) => DATA.filter((s) => s.performanceType === type)
    .reduce((s, show) => s + showCount(show), 0);
  const totalCount = DATA.reduce((s, show) => s + showCount(show), 0);

  return (
    <aside
      className={`bg-white border-r border-gray-200 flex flex-col flex-shrink-0 fixed inset-y-0 left-0 z-40 w-72 transform transition-transform duration-200 ease-out md:static md:translate-x-0 md:w-64 md:transform-none md:transition-none ${isMobileOpen ? "translate-x-0 shadow-xl" : "-translate-x-full"}`}
    >
      <div className="md:hidden flex items-center justify-between px-3 h-12 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-700">Navigation</span>
        <button type="button" aria-label="Close navigation" onClick={onClose}
          className="p-2 -mr-2 rounded-md text-gray-500 hover:bg-gray-100">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="px-3 py-2 border-b border-gray-100">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Show or role name"
          className="w-full h-8 px-2.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-200 placeholder:text-gray-300" />
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 text-sm">
        {/* Level 0: All Performers */}
        <button onClick={() => onSelectScope({ kind: "all" })}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors mb-1 ${scope.kind === "all" ? "bg-brand-50 text-brand-700 font-semibold" : "text-gray-700 hover:bg-gray-50"}`}>
          <span>All Performers</span>
          <span className={`text-xs ${scope.kind === "all" ? "text-brand-600" : "text-gray-400"}`}>({totalCount})</span>
        </button>

        {/* Level 1: Show Type */}
        {PERFORMANCE_TYPES.map((type) => {
          const typeShows = DATA.filter((s) => s.performanceType === type);
          if (typeShows.length === 0) return null;
          const typeExpanded = expandedTypes.has(type);
          const typeSelected = scope.kind === "showType" && scope.type === type;
          if (search && !typeShows.some((s) => matchesSearch(s.name) || s.roles.some((r) => matchesSearch(r.name)))) return null;
          return (
            <div key={type}>
              <div className={`w-full flex items-center justify-between rounded-lg transition-colors ${typeSelected ? "bg-brand-50" : "hover:bg-gray-50"}`}>
                <button onClick={() => onSelectScope({ kind: "showType", type })}
                  className={`flex-1 text-left px-3 py-2 text-xs uppercase tracking-wide font-semibold ${typeSelected ? "text-brand-700" : "text-brand-600"}`}>
                  {type} <span className="text-gray-500 font-normal normal-case">({typeCount(type)})</span>
                </button>
                <button onClick={() => toggle(expandedTypes, setExpandedTypes, type)} aria-label={`Toggle ${type}`}
                  className="px-2 py-2 text-gray-400 hover:text-gray-600">
                  {typeExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Level 2: Show */}
              {typeExpanded && typeShows.map((show) => {
                const sCount = showCount(show);
                const showExpanded = expandedShows.has(show.id);
                const showSelected = scope.kind === "show" && scope.showId === show.id;
                if (search && !matchesSearch(show.name) && !show.roles.some((r) => matchesSearch(r.name))) return null;
                return (
                  <div key={show.id}>
                    <div className={`w-full flex items-center justify-between rounded-lg transition-colors ${showSelected ? "bg-brand-100" : "hover:bg-gray-50"}`}>
                      <button onClick={() => onSelectScope({ kind: "show", showId: show.id })}
                        className={`flex-1 text-left pl-5 pr-1 py-1.5 ${showSelected ? "text-brand-700 font-medium" : "text-gray-700"}`}>
                        <span className="flex items-center gap-1">
                          <span>{show.name}</span>
                          <span className={`text-xs ${showSelected ? "text-brand-500" : "text-gray-400"}`}>({sCount})</span>
                        </span>
                      </button>
                      <button onClick={() => toggle(expandedShows, setExpandedShows, show.id)} aria-label={`Toggle ${show.name}`}
                        className="px-2 py-1.5 text-gray-400 hover:text-gray-600">
                        {showExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </div>

                    {/* Level 3: Role */}
                    {showExpanded && show.roles.map((role) => {
                      if (search && !matchesSearch(role.name)) return null;
                      const isSelected = scope.kind === "role" && scope.showId === show.id && scope.roleId === role.id;
                      return (
                        <button key={role.id} onClick={() => onSelectScope({ kind: "role", showId: show.id, roleId: role.id })}
                          className={`w-full flex items-center justify-between pl-9 pr-3 py-1.5 rounded-lg text-left text-xs transition-colors ${isSelected ? "bg-brand-100 text-brand-700 font-semibold" : "text-gray-500 hover:bg-gray-50"}`}>
                          <span>{role.name}</span>
                          <span className={isSelected ? "text-brand-500" : "text-gray-400"}>({roleCount(role)})</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
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

  const [scope, setScopeRaw] = useState<Scope>({ kind: "all" });
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [assignPerformersOpen, setAssignPerformersOpen] = useState(false);
  const [offBoardOpen, setOffBoardOpen] = useState(false);
  // Data Ops modals (PC-only): performer import, basic-info update, replace SSO.
  const [importModal, setImportModal] = useState<null | "performers" | "updateBasic" | "sso" | "event" | "showRole" | "headshot">(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [statusOverrides, setStatusOverrides] = useState<Record<number, ActorStatus>>({});

  const statusOf = useCallback(
    (a: Actor) => statusOverrides[a.id] ?? a.status ?? "Employed",
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

  function setScope(next: Scope) {
    setScopeRaw(next);
    setSelectedCategory("All");
  }

  const selectedShow = useMemo(
    () => (scope.kind === "show" || scope.kind === "role") ? DATA.find((s) => s.id === scope.showId) ?? null : null,
    [scope],
  );
  const selectedRole = useMemo(
    () => scope.kind === "role" ? selectedShow?.roles.find((r) => r.id === scope.roleId) ?? null : null,
    [scope, selectedShow],
  );

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
    : selectedRole
      ? `${selectedShow?.name ?? ""} / ${selectedRole.name} — Casting Book`
      : scope.kind === "show"
        ? `${selectedShow?.name ?? ""} — Casting Book`
        : scope.kind === "showType"
          ? `${scope.type} — Casting Book`
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
          {selectedRole ? `${selectedShow?.name ?? ""} / ${selectedRole.name}` : ""}
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
          scope={scope}
          onSelectScope={(next) => { setScope(next); closeSidebarOnMobile(); }}
          isMobileOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            <CardView scope={scope}
              selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory}
              onAssignPerformers={() => setAssignPerformersOpen(true)}
              onTerminate={() => setOffBoardOpen(true)}
              onOpenActor={openActor}
              onImportPerformers={() => setImportModal("performers")}
              onUpdateBasic={() => setImportModal("updateBasic")}
              onReplaceSso={() => setImportModal("sso")}
              onImportEvent={() => setImportModal("event")}
              onImportShowRole={() => setImportModal("showRole")}
              onImportHeadshot={() => setImportModal("headshot")}
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

      {assignPerformersOpen && selectedShow && selectedRole && (
        <AssignPerformersDialog
          show={selectedShow}
          role={selectedRole}
          defaultRoleType="home"
          onClose={() => setAssignPerformersOpen(false)}
          onSubmit={() => setAssignPerformersOpen(false)}
        />
      )}
      {offBoardOpen && <OffBoardDialog onClose={() => setOffBoardOpen(false)} />}
      {importModal === "performers" && <RosterImportModal onClose={() => setImportModal(null)} />}
      {importModal === "updateBasic" && <UpdateBasicInfoModal onClose={() => setImportModal(null)} />}
      {importModal === "sso" && <SsoReplacementModal onClose={() => setImportModal(null)} />}
      {importModal === "event" && <ImportEventExperienceModal onClose={() => setImportModal(null)} />}
      {importModal === "showRole" && <ImportShowRoleModal onClose={() => setImportModal(null)} />}
      {importModal === "headshot" && <ImportHeadshotModal onClose={() => setImportModal(null)} />}
    </div>
    </StatusCtx.Provider>
  );
}
