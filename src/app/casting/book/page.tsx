/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useMemo } from "react";
import {
  BookOpen, X, Pencil, Upload, Play, ChevronDown, ChevronUp,
  ArrowUp, ArrowDown, ArrowUpDown, LayoutGrid, List,
  Search, RotateCcw, Eye, Users, Film, Plus, Paperclip,
  ChevronLeft, ChevronRight,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

interface MediaFile { type: "photo" | "video"; url: string; duration?: string }
interface SwingRecord { id: string; showName: string; roleName: string; note: string; createdAt: string; status: "active" | "inactive" }
interface EventRecord { id: string; eventName: string; roleName: string; startDate: string; endDate: string; status: "active" | "inactive" }
interface Measurements { height: number; weight: number; chest: number; waist: number; hip: number; inseam: number; shoeSize: number }
interface Attachment { id: string; name: string; fileType: string }

interface Actor {
  id: number; ssoId: string; name: string; nationality: string; flag: string;
  height: number; weight: number; photoUrl: string;
  homeShow?: string; homeRole?: string; contractEndDate?: string;
  skillsets?: string[];
  mediaFiles?: MediaFile[]; swingRecords?: SwingRecord[]; eventRecords?: EventRecord[];
  measurements?: Measurements; attachments?: Attachment[];
}

interface Role { id: string; name: string; headCount: number; homeActors: Actor[]; swingActors: Actor[] }
interface Show { id: string; name: string; roles: Role[] }
interface Land { id: string; label: string; shows: Show[] }

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

const ALL_SKILLSETS = ["Acrobatics", "Ballet", "Contemporary", "Hip Hop", "Jazz", "Aerial", "Martial Arts", "Singing", "Stunt", "Character Act", "Puppetry", "Improv"];
const CONTRACT_DATES = ["2024-11-03", "2025-08-11", "2025-03-22", "2025-06-15", "2026-01-01", "2025-12-31", "2026-03-15", "2025-09-30"];
const SWING_SHOWS = ["UOP", "UCHMMG", "TSMMG", "RPTEA", "PL"];
const SWING_ROLES = ["Parade Wushu", "Dragon Dance", "Ollivanders", "Raptor Encounter", "Main Stage Cast", "Fan Dance", "Frog Choir", "Stilt Walkers"];
const EVENT_NAMES = ["Summer Spectacular", "Christmas Parade", "Halloween Night", "Grand Opening Gala", "Anniversary Show", "VIP Preview Night", "Media Day", "Charity Event"];
const EVENT_ROLE_POOL = ["Lead Performer", "Ensemble", "Character", "Stunt Double", "Aerial Artist", "Host"];
const ATTACHMENT_NAMES = ["Resume_2024.pdf", "Headshot_2023.pdf", "Demo_Reel.mp4", "Contract.pdf", "Portfolio.pdf"];

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
  const skillCount = 3 + (dHash(seed * 3) % 3);
  const skillIndexes = Array.from({ length: skillCount }, (_, i) => dHash(seed * 11 + i) % ALL_SKILLSETS.length);
  const mediaFiles: MediaFile[] = [
    { type: "video", url: `https://randomuser.me/api/portraits/${pool.gender}/${photoNum}.jpg`, duration: `0${2 + (dHash(seed * 5) % 5)}:${String(dHash(seed * 17) % 60).padStart(2, "0")}` },
    ...Array.from({ length: 4 + (dHash(seed * 2) % 3) }, (_, i) => ({
      type: "photo" as const,
      url: `https://randomuser.me/api/portraits/${pool.gender}/${((photoNum + i + 1) % 70) + 1}.jpg`,
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
    skillsets: [...new Set(skillIndexes.map((i) => ALL_SKILLSETS[i]))],
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

// ── Actor Detail Drawer ────────────────────────────────────────────────────

function ActorDetailDrawer({ actor, roleLabel, onClose, defaultMode = "view" }: {
  actor: Actor; roleLabel: string; onClose: () => void; defaultMode?: "view" | "edit";
}) {
  const [mode, setMode] = useState<"view" | "edit">(defaultMode);
  const [collapsed, setCollapsed] = useState({
    skills: false, portfolio: true, showRole: false,
    measurements: true, event: true, attachments: true,
  });

  // Skill tags
  const [skills, setSkills] = useState<string[]>(actor.skillsets ?? []);
  function toggleSkill(s: string) {
    setSkills((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s]);
  }

  // Swing records
  const [swingRecords, setSwingRecords] = useState<SwingRecord[]>(actor.swingRecords ?? []);
  const [addingSwing, setAddingSwing] = useState(false);
  const [swingForm, setSwingForm] = useState({ showName: "", roleName: "", note: "" });

  // Event records
  const [eventRecords, setEventRecords] = useState<EventRecord[]>(actor.eventRecords ?? []);
  const [addingEvent, setAddingEvent] = useState(false);
  const [eventForm, setEventForm] = useState({ eventName: "", roleName: "", startDate: "", endDate: "" });

  // Portfolio
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>(actor.mediaFiles ?? []);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  // Measurements (height/weight linked to basic info display)
  const [meas, setMeas] = useState<Measurements>(
    actor.measurements ?? { height: actor.height, weight: actor.weight, chest: 85, waist: 65, hip: 90, inseam: 75, shoeSize: 40 }
  );

  // Attachments
  const [attachments, setAttachments] = useState<Attachment[]>(actor.attachments ?? []);

  const toggle = (s: keyof typeof collapsed) => setCollapsed((p) => ({ ...p, [s]: !p[s] }));
  const activeSwing = swingRecords.filter((r) => r.status === "active");
  const activeEvents = eventRecords.filter((r) => r.status === "active");

  function addSwing() {
    if (!swingForm.showName || !swingForm.roleName) return;
    setSwingRecords((p) => [{ id: `sw-${Date.now()}`, ...swingForm, createdAt: new Date().toISOString().split("T")[0], status: "active" }, ...p]);
    setSwingForm({ showName: "", roleName: "", note: "" });
    setAddingSwing(false);
  }

  function addEvent() {
    if (!eventForm.eventName || !eventForm.startDate) return;
    setEventRecords((p) => [{ id: `ev-${Date.now()}`, ...eventForm, status: "active" }, ...p]);
    setEventForm({ eventName: "", roleName: "", startDate: "", endDate: "" });
    setAddingEvent(false);
  }

  const inputCls = "w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300";
  const labelCls = "block text-xs text-gray-400 mb-1";

  return (
    <>
      {lightboxIdx !== null && (
        <Lightbox files={mediaFiles} initialIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[480px] bg-white shadow-2xl flex flex-col">

        {/* Photo header */}
        <div className="relative flex-shrink-0 h-48 bg-gray-100">
          <img src={actor.photoUrl} alt={actor.name} className="w-full h-full object-cover object-top" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <button onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-4 left-5 right-20">
            <p className="text-xs text-gray-300 mb-0.5">{roleLabel}</p>
            <p className="text-xl font-bold text-white leading-tight truncate">{actor.name}</p>
          </div>
          {mode === "edit" && (
            <span className="absolute bottom-5 right-5 text-xs px-2 py-0.5 rounded-full font-medium bg-amber-400 text-amber-900">Editing</span>
          )}
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

          {/* ── Skill Tags ── */}
          <div className="border-b border-gray-100">
            <div className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => toggle("skills")}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">Skill Tags</span>
                <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">{skills.length}</span>
              </div>
              {collapsed.skills ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
            </div>
            {!collapsed.skills && (
              <div className="px-5 pb-4">
                {mode === "edit" ? (
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Click to toggle skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_SKILLSETS.map((s) => (
                        <button key={s} onClick={() => toggleSkill(s)}
                          className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
                            skills.includes(s) ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {skills.length === 0
                      ? <span className="text-xs text-gray-300">No skills added</span>
                      : skills.map((s) => <span key={s} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full font-medium">{s}</span>)
                    }
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Portfolio ── */}
          <div className="border-b border-gray-100">
            <div className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => toggle("portfolio")}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">Portfolio</span>
                <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">{mediaFiles.length}</span>
              </div>
              {collapsed.portfolio ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
            </div>
            {!collapsed.portfolio && (
              <div className="px-5 pb-4">
                {mediaFiles.length === 0 && mode === "view" && (
                  <p className="text-xs text-gray-300 py-3 text-center">No media files</p>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {mediaFiles.map((f, i) => (
                    <div key={i} className="relative rounded-xl overflow-hidden bg-gray-100 aspect-[3/4] group/media">
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
                      {mode === "view" ? (
                        <button onClick={() => setLightboxIdx(i)} className="absolute inset-0 opacity-0 group-hover/media:opacity-100 bg-black/20 transition-opacity flex items-center justify-center">
                          <Eye className="w-5 h-5 text-white drop-shadow" />
                        </button>
                      ) : (
                        <button onClick={() => setMediaFiles((p) => p.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors opacity-0 group-hover/media:opacity-100">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {mode === "edit" && (
                    <div className="rounded-xl border-2 border-dashed border-gray-200 aspect-[3/4] flex flex-col items-center justify-center gap-1.5 text-gray-300 hover:border-indigo-300 hover:text-indigo-400 transition-colors cursor-pointer">
                      <Plus className="w-5 h-5" /><span className="text-xs font-medium">Add</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Show & Role (Home + Swing) ── */}
          <div className="border-b border-gray-100">
            <div className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => toggle("showRole")}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">Show &amp; Role</span>
                <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">
                  {(actor.homeShow ? 1 : 0) + activeSwing.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {mode === "edit" && !collapsed.showRole && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); setAddingSwing(true); }}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium px-2 py-0.5 rounded hover:bg-indigo-50 transition-colors">
                    <Plus className="w-3.5 h-3.5" />Add Swing
                  </button>
                )}
                {collapsed.showRole ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
              </div>
            </div>
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
                      <div><label className={labelCls}>Show</label><input value={swingForm.showName} onChange={(e) => setSwingForm((f) => ({ ...f, showName: e.target.value }))} className={inputCls} placeholder="e.g. UOP" /></div>
                      <div><label className={labelCls}>Role</label><input value={swingForm.roleName} onChange={(e) => setSwingForm((f) => ({ ...f, roleName: e.target.value }))} className={inputCls} placeholder="e.g. Fan Dance" /></div>
                    </div>
                    <div><label className={labelCls}>Note</label><input value={swingForm.note} onChange={(e) => setSwingForm((f) => ({ ...f, note: e.target.value }))} className={inputCls} placeholder="Optional" /></div>
                    <div className="flex gap-2 justify-end pt-1">
                      <button onClick={() => { setAddingSwing(false); setSwingForm({ showName: "", roleName: "", note: "" }); }}
                        className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-white transition-colors">Cancel</button>
                      <button onClick={addSwing}
                        className="text-xs px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors">Save</button>
                    </div>
                  </div>
                )}
                {/* Swing records */}
                {swingRecords.map((rec) => (
                  <div key={rec.id} className={`flex items-center justify-between p-3 rounded-xl border ${rec.status === "inactive" ? "border-gray-100 opacity-50" : "border-amber-100 bg-amber-50"}`}>
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
                      {mode === "edit" && rec.status === "active" && (
                        <button onClick={() => setSwingRecords((p) => p.map((r) => r.id === rec.id ? { ...r, status: "inactive" } : r))}
                          className="text-xs text-red-400 hover:text-red-600 px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors">Remove</button>
                      )}
                    </div>
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
            <div className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => toggle("measurements")}>
              <span className="text-sm font-semibold text-gray-900">Measurements</span>
              {collapsed.measurements ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
            </div>
            {!collapsed.measurements && (
              <div className="px-5 pb-4">
                {mode === "edit" ? (
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      ["Height (cm)", "height"], ["Weight (kg)", "weight"], ["Chest (cm)", "chest"],
                      ["Waist (cm)", "waist"], ["Hip (cm)", "hip"], ["Inseam (cm)", "inseam"],
                      ["Shoe Size (EU)", "shoeSize"],
                    ] as [string, keyof Measurements][]).map(([lbl, key]) => (
                      <div key={key}>
                        <label className={labelCls}>{lbl}</label>
                        <input type="number" value={meas[key]}
                          onChange={(e) => setMeas((p) => ({ ...p, [key]: +e.target.value }))}
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
            <div className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => toggle("event")}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">Event Experience</span>
                <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">{activeEvents.length}</span>
              </div>
              <div className="flex items-center gap-2">
                {mode === "edit" && !collapsed.event && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); setAddingEvent(true); }}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium px-2 py-0.5 rounded hover:bg-indigo-50 transition-colors">
                    <Plus className="w-3.5 h-3.5" />Add
                  </button>
                )}
                {collapsed.event ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
              </div>
            </div>
            {!collapsed.event && (
              <div className="px-5 pb-4 space-y-2">
                {addingEvent && (
                  <div className="p-3 bg-indigo-50 rounded-xl space-y-2 border border-indigo-100">
                    <div><label className={labelCls}>Event Name</label><input value={eventForm.eventName} onChange={(e) => setEventForm((f) => ({ ...f, eventName: e.target.value }))} className={inputCls} placeholder="e.g. Summer Spectacular" /></div>
                    <div><label className={labelCls}>Role</label><input value={eventForm.roleName} onChange={(e) => setEventForm((f) => ({ ...f, roleName: e.target.value }))} className={inputCls} placeholder="e.g. Lead Performer" /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className={labelCls}>Start Date</label><input type="date" value={eventForm.startDate} onChange={(e) => setEventForm((f) => ({ ...f, startDate: e.target.value }))} className={inputCls} /></div>
                      <div><label className={labelCls}>End Date</label><input type="date" value={eventForm.endDate} onChange={(e) => setEventForm((f) => ({ ...f, endDate: e.target.value }))} className={inputCls} /></div>
                    </div>
                    <div className="flex gap-2 justify-end pt-1">
                      <button onClick={() => { setAddingEvent(false); setEventForm({ eventName: "", roleName: "", startDate: "", endDate: "" }); }}
                        className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-white transition-colors">Cancel</button>
                      <button onClick={addEvent} className="text-xs px-3 py-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors">Save</button>
                    </div>
                  </div>
                )}
                {eventRecords.length === 0 && !addingEvent && (
                  <p className="text-xs text-gray-300 py-3 text-center">No event records</p>
                )}
                {eventRecords.map((rec) => (
                  <div key={rec.id} className={`p-3 rounded-xl border ${rec.status === "inactive" ? "border-gray-100 opacity-50" : "border-gray-200"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-900 truncate">{rec.eventName}</span>
                          <span className={`ml-2 flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full font-medium ${rec.status === "active" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                            {rec.status === "active" ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p className="text-xs text-indigo-600 mt-0.5">{rec.roleName}</p>
                        <p className="text-xs text-gray-400 mt-1">{rec.startDate} → {rec.endDate}</p>
                      </div>
                      {mode === "edit" && rec.status === "active" && (
                        <button onClick={() => setEventRecords((p) => p.map((r) => r.id === rec.id ? { ...r, status: "inactive" } : r))}
                          className="flex-shrink-0 text-xs text-red-400 hover:text-red-600 px-2 py-0.5 rounded hover:bg-red-50 transition-colors">Remove</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Attachments ── */}
          <div className="border-b border-gray-100">
            <div className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => toggle("attachments")}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">Attachments</span>
                <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">{attachments.length}</span>
              </div>
              {collapsed.attachments ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
            </div>
            {!collapsed.attachments && (
              <div className="px-5 pb-4 space-y-2">
                {attachments.length === 0 && mode === "view" && (
                  <p className="text-xs text-gray-300 py-3 text-center">No attachments</p>
                )}
                {attachments.map((att) => (
                  <div key={att.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
                    <Paperclip className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-xs text-gray-700 flex-1 truncate">{att.name}</span>
                    {mode === "edit" && (
                      <button onClick={() => setAttachments((p) => p.filter((a) => a.id !== att.id))}
                        className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                {mode === "edit" && (
                  <div className="flex items-center gap-2 p-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-300 hover:border-indigo-300 hover:text-indigo-400 transition-colors cursor-pointer">
                    <Plus className="w-4 h-4" /><span className="text-xs font-medium">Add Attachment</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-5 py-4 flex gap-3 flex-shrink-0">
          {mode === "view" ? (
            <>
              <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">Close</button>
              <button onClick={() => setMode("edit")}
                className="flex-1 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 transition-colors flex items-center justify-center gap-1.5">
                <Pencil className="w-3.5 h-3.5" />Edit
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setMode("view")} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={() => setMode("view")} className="flex-1 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 transition-colors">Save</button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Upload Modal ───────────────────────────────────────────────────────────

function UploadModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ sso: "", name: "", nationality: "", height: "", weight: "", homeShow: "", homeRole: "" });
  const allShowNames = DATA.flatMap((l) => l.shows).map((s) => s.name);
  const selectedShowRoles = DATA.flatMap((l) => l.shows).find((s) => s.name === form.homeShow)?.roles.map((r) => r.name) ?? [];
  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v, ...(k === "homeShow" ? { homeRole: "" } : {}) }));
  const valid = Object.values(form).every((v) => v.trim() !== "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Add Performer</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-5 grid grid-cols-2 gap-4">
          {([
            ["SSO ID", "sso", "text", "e.g. 20017233"],
            ["Full Name", "name", "text", "e.g. Arthur William Bennett"],
            ["Nationality", "nationality", "text", "e.g. British"],
          ] as [string, keyof typeof form, string, string][]).map(([lbl, key, type, ph]) => (
            <div key={key} className={key === "name" ? "col-span-2" : ""}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{lbl} <span className="text-red-400">*</span></label>
              <input type={type} value={form[key]} onChange={(e) => set(key, e.target.value)} placeholder={ph}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 placeholder:text-gray-300" />
            </div>
          ))}
          {([["Height (cm)", "height"], ["Weight (kg)", "weight"]] as [string, keyof typeof form][]).map(([lbl, key]) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{lbl} <span className="text-red-400">*</span></label>
              <input type="number" value={form[key]} onChange={(e) => set(key, e.target.value)} placeholder="e.g. 176"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 placeholder:text-gray-300" />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Home Show <span className="text-red-400">*</span></label>
            <select value={form.homeShow} onChange={(e) => set("homeShow", e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 text-gray-700">
              <option value="">Select</option>
              {allShowNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Home Role <span className="text-red-400">*</span></label>
            <select value={form.homeRole} onChange={(e) => set("homeRole", e.target.value)} disabled={!form.homeShow}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 text-gray-700 disabled:opacity-50">
              <option value="">Select</option>
              {selectedShowRoles.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 pb-5">
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={onClose} disabled={!valid} className="px-5 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Confirm</button>
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
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 placeholder:text-gray-300" />
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

// ── Performer Card (card grid) ─────────────────────────────────────────────

function PerformerCard({ actor, index, type }: { actor: Actor; index: number; type: "home" | "swing" }) {
  const label = type === "home" ? `Home #${index + 1}` : `Swing #${index + 1}`;
  const [open, setOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"view" | "edit">("view");

  return (
    <>
      {open && <ActorDetailDrawer actor={actor} roleLabel={label} onClose={() => setOpen(false)} defaultMode={drawerMode} />}
      <div className="group relative bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
        <div className="absolute top-2 left-2 z-10">
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${type === "home" ? "bg-indigo-500 text-white" : "bg-amber-400 text-amber-900"}`}>
            {type === "home" ? `H${index + 1}` : `S${index + 1}`}
          </span>
        </div>
        <button onClick={(e) => { e.stopPropagation(); setDrawerMode("edit"); setOpen(true); }}
          className="absolute top-2 right-2 z-10 w-6 h-6 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
          <Pencil className="w-3 h-3" />
        </button>
        <div className="relative w-full cursor-pointer" style={{ paddingBottom: "133%" }} onClick={() => { setDrawerMode("view"); setOpen(true); }}>
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

function CardView({ selectedShow, selectedRole, castTab, setCastTab, onCast }: {
  selectedShow: Show | null; selectedRole: Role | null;
  castTab: "home" | "swing"; setCastTab: (t: "home" | "swing") => void;
  onCast: () => void;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);

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

  // Items for pagination: actors + vacancy placeholders (home only)
  const allItems = castTab === "home"
    ? [...allActors.map((a, i) => ({ type: "actor" as const, actor: a, index: i })),
       ...Array.from({ length: vacancy }, (_, i) => ({ type: "vacant" as const, vacantIndex: i }))]
    : allActors.map((a, i) => ({ type: "actor" as const, actor: a, index: i }));

  const totalItems = allItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeP = Math.min(page, totalPages);
  const pageItems = allItems.slice((safeP - 1) * pageSize, safeP * pageSize);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 pt-5 pb-4">
          {/* Role header + stats */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">{selectedShow.name}</p>
              <h2 className="text-lg font-bold text-gray-900">{selectedRole.name}</h2>
            </div>
            <button onClick={onCast}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 transition-colors shadow-sm">
              <Users className="w-4 h-4" />Assign Cast
            </button>
          </div>

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
            {vacancy > 0 && (
              <button onClick={onCast}
                className="ml-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 rounded-full transition-colors">
                Fill Vacancy →
              </button>
            )}
          </div>

          {/* Home / Swing tabs */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl w-fit mb-5">
            {(["home", "swing"] as const).map((t) => {
              const count = t === "home" ? selectedRole.homeActors.length : selectedRole.swingActors.length;
              return (
                <button key={t} onClick={() => { setCastTab(t); setPage(1); }}
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
              {pageItems.map((item, i) =>
                item.type === "actor"
                  ? <PerformerCard key={item.actor.id} actor={item.actor} index={item.index} type={castTab} />
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

// ── List View ──────────────────────────────────────────────────────────────

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

function ListView({ onUpload }: { onUpload: () => void }) {
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [drawerActor, setDrawerActor] = useState<Actor | null>(null);
  const [drawerMode, setDrawerMode] = useState<"view" | "edit">("view");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Filters
  const [q, setQ] = useState("");
  const [filterShow, setFilterShow] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterSkill, setFilterSkill] = useState("");
  const [filterHeight, setFilterHeight] = useState("");
  const [filterEvent, setFilterEvent] = useState("");

  const allShowNames = DATA.flatMap((l) => l.shows).map((s) => s.name);
  const rolesForShow = DATA.flatMap((l) => l.shows).find((s) => s.name === filterShow)?.roles.map((r) => r.name) ?? [];

  function handleSort(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("asc"); }
  }

  function reset() {
    setQ(""); setFilterShow(""); setFilterRole(""); setFilterSkill("");
    setFilterHeight(""); setFilterEvent(""); setSortKey(null); setPage(1);
  }

  const filtered = useMemo(() => {
    let result = PERFORMERS;
    if (q) { const lq = q.toLowerCase(); result = result.filter((p) => p.name.toLowerCase().includes(lq) || p.ssoId.includes(lq)); }
    if (filterShow) result = result.filter((p) => p.homeShow === filterShow);
    if (filterRole) result = result.filter((p) => p.homeRole === filterRole);
    if (filterSkill) result = result.filter((p) => p.skillsets?.includes(filterSkill));
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
  }, [q, filterShow, filterRole, filterSkill, filterHeight, filterEvent]);

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

  const hasFilters = !!(q || filterShow || filterRole || filterSkill || filterHeight || filterEvent);

  return (
    <div className="flex flex-col h-full">
      {drawerActor && (
        <ActorDetailDrawer actor={drawerActor} roleLabel={`${drawerActor.homeShow ?? ""} / ${drawerActor.homeRole ?? ""}`}
          onClose={() => setDrawerActor(null)} defaultMode={drawerMode} />
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

        <select value={filterSkill} onChange={(e) => { setFilterSkill(e.target.value); setPage(1); }}
          className="h-8 px-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 text-gray-700 w-32">
          <option value="">All Skills</option>
          {ALL_SKILLSETS.map((s) => <option key={s} value={s}>{s}</option>)}
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
        <button onClick={onUpload} className="h-8 flex items-center gap-1.5 px-3 bg-indigo-500 text-white rounded-lg text-xs font-medium hover:bg-indigo-600 transition-colors">
          <Upload className="w-3.5 h-3.5" />Add
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
              <tr><td colSpan={10} className="text-center py-16 text-gray-300 text-sm">No performers found</td></tr>
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
                    <button onClick={() => { setDrawerActor(p); setDrawerMode("edit"); }} className="text-xs text-gray-500 hover:text-gray-800 font-medium mr-3 transition-colors">Edit</button>
                    <button onClick={() => { setDrawerActor(p); setDrawerMode("view"); }} className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors">View</button>
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

// ── Main Page ──────────────────────────────────────────────────────────────

type ViewMode = "card" | "list";

export default function CastingBookPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [selectedLandId, setSelectedLandId] = useState(DATA[0].id);
  const [selectedShowId, setSelectedShowId] = useState<string>(DATA[0].shows[0].id);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [castTab, setCastTab] = useState<"home" | "swing">("home");
  const [showCastDialog, setShowCastDialog] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const land = useMemo(() => DATA.find((l) => l.id === selectedLandId) ?? DATA[0], [selectedLandId]);
  const selectedShow = useMemo(() => land.shows.find((s) => s.id === selectedShowId) ?? null, [land, selectedShowId]);
  const selectedRole = useMemo(() => selectedRoleId ? selectedShow?.roles.find((r) => r.id === selectedRoleId) ?? null : null, [selectedShow, selectedRoleId]);

  function selectShow(showId: string) { setSelectedShowId(showId); setSelectedRoleId(null); setCastTab("home"); }
  function selectRole(roleId: string) { setSelectedRoleId(roleId); setCastTab("home"); }

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
            <button key={l.id} onClick={() => { setSelectedLandId(l.id); setSelectedShowId(l.shows[0].id); setSelectedRoleId(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedLandId === l.id ? "bg-indigo-50 text-indigo-700" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}>
              {l.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
          {([
            ["card", "Cards", LayoutGrid],
            ["list", "Performers", List],
          ] as [ViewMode, string, React.ElementType][]).map(([mode, label, Icon]) => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === mode ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>
      </header>

      {/* Show & Role nav (card mode only) */}
      {viewMode === "card" && (
        <div className="bg-white border-b border-gray-100 flex-shrink-0">
          <div className="px-5 pt-3 flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {land.shows.map((show) => {
              const active = show.id === selectedShowId;
              const home = show.roles.reduce((s, r) => s + r.homeActors.length, 0);
              return (
                <button key={show.id} onClick={() => selectShow(show.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-t-xl text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${active ? "border-indigo-500 text-indigo-700 bg-indigo-50/50" : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}>
                  {show.name}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${active ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-500"}`}>{home}</span>
                </button>
              );
            })}
          </div>

          {selectedShow && (
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
            castTab={castTab} setCastTab={setCastTab} onCast={() => setShowCastDialog(true)} />
        )}
        {viewMode === "list" && <ListView onUpload={() => setShowUploadModal(true)} />}
      </div>

      {showCastDialog && selectedShow && selectedRole && (
        <CastDialog show={selectedShow} role={selectedRole} onClose={() => setShowCastDialog(false)} />
      )}
      {showUploadModal && <UploadModal onClose={() => setShowUploadModal(false)} />}
    </div>
  );
}
