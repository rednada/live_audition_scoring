/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useMemo } from "react";
import {
  ChevronRight, ChevronDown, BookOpen, X, Pencil,
  List, Users, LayoutGrid, Upload, Play,
  ArrowUp, ArrowDown, ArrowUpDown, Eye,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

interface MediaFile {
  type: "photo" | "video";
  url: string;
  duration?: string;
}

interface Actor {
  id: number;
  ssoId: string;
  name: string;
  nationality: string;
  flag: string;
  height: number;
  weight: number;
  photoUrl: string;
  homeShow?: string;
  homeRole?: string;
  contractEndDate?: string;
  skillsets?: string[];
  mediaFiles?: MediaFile[];
}

interface Role { id: string; name: string; homeActors: Actor[]; swingActors: Actor[] }
interface Show { id: string; name: string; roles: Role[] }
interface Land { id: string; label: string; shows: Show[] }

// ── Helpers ────────────────────────────────────────────────────────────────

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

function dHash(n: number): number {
  let x = n ^ (n >>> 16);
  x = Math.imul(x, 0x45d9f3b);
  x = x ^ (x >>> 16);
  return Math.abs(x);
}

function genActors(seed: number, count: number): Actor[] {
  return Array.from({ length: count }, (_, i) => {
    const h = dHash(seed * 31 + i * 17);
    const pool = ACTOR_POOL[h % ACTOR_POOL.length];
    const photoNum = (dHash(seed * 13 + i * 7) % 70) + 1;
    return {
      id: seed * 100 + i,
      ssoId: `${100000 + (dHash(seed * 5 + i) % 900000)}`,
      name: pool.name, nationality: pool.nationality, flag: pool.flag,
      height: 162 + (dHash(seed + i + 5) % 24),
      weight: 50 + (dHash(seed + i + 3) % 30),
      photoUrl: `https://randomuser.me/api/portraits/${pool.gender}/${photoNum}.jpg`,
    };
  });
}

// ── Card-view Mock Data ────────────────────────────────────────────────────

const DATA: Land[] = [{
  id: "ftp", label: "Full Time Performer",
  shows: [
    { id: "uop", name: "UOP", roles: [
      { id: "uop-pw", name: "Parade Wushu", homeActors: genActors(101, 5), swingActors: genActors(102, 2) },
      { id: "uop-pv", name: "Parade Viper", homeActors: genActors(103, 8), swingActors: genActors(104, 3) },
      { id: "uop-dragon", name: "Dragon Dance", homeActors: genActors(105, 12), swingActors: genActors(106, 4) },
      { id: "uop-acrobat", name: "Acrobat Troupe", homeActors: genActors(107, 10), swingActors: genActors(108, 3) },
      { id: "uop-fan", name: "Fan Dance", homeActors: genActors(109, 20), swingActors: genActors(110, 5) },
      { id: "uop-drum", name: "Drum Corps", homeActors: genActors(111, 15), swingActors: genActors(112, 4) },
      { id: "uop-lion", name: "Lion Dance", homeActors: genActors(113, 8), swingActors: genActors(114, 2) },
      { id: "uop-ribbon", name: "Ribbon Ensemble", homeActors: genActors(115, 18), swingActors: genActors(116, 5) },
      { id: "uop-stilt", name: "Stilt Walkers", homeActors: genActors(117, 6), swingActors: genActors(118, 2) },
      { id: "uop-float", name: "Float Performers", homeActors: genActors(119, 57), swingActors: genActors(120, 12) },
    ]},
    { id: "uchmmg", name: "UCHMMG", roles: [
      { id: "uchmmg-ollivanders", name: "Ollivanders", homeActors: genActors(201, 16), swingActors: genActors(202, 3) },
      { id: "uchmmg-conductor", name: "Conductor", homeActors: genActors(203, 3), swingActors: genActors(204, 1) },
      { id: "uchmmg-triwizard", name: "Triwizard Spirit Rally", homeActors: genActors(205, 18), swingActors: genActors(206, 4) },
      { id: "uchmmg-frog", name: "Frog Choir", homeActors: genActors(207, 9), swingActors: genActors(208, 2) },
      { id: "uchmmg-wand", name: "Wand Ceremony", homeActors: genActors(209, 9), swingActors: genActors(210, 2) },
    ]},
    { id: "tsmmg", name: "TSMMG", roles: [
      { id: "tsmmg-raptor", name: "Raptor Encounter", homeActors: genActors(301, 31), swingActors: genActors(302, 8) },
      { id: "tsmmg-tf", name: "Transformers", homeActors: genActors(303, 23), swingActors: genActors(304, 6) },
      { id: "tsmmg-po", name: "Po Live", homeActors: genActors(305, 4), swingActors: genActors(306, 1) },
      { id: "tsmmg-baby", name: "Baby Raptor", homeActors: genActors(307, 3), swingActors: genActors(308, 1) },
      { id: "tsmmg-veloci", name: "Velocicoaster Crew", homeActors: genActors(309, 10), swingActors: genActors(310, 3) },
    ]},
    { id: "rptea", name: "RPTEA", roles: [
      { id: "rptea-knights", name: "Knights Tournament", homeActors: genActors(401, 45), swingActors: genActors(402, 10) },
      { id: "rptea-dragon", name: "Dragon Show", homeActors: genActors(403, 30), swingActors: genActors(404, 8) },
      { id: "rptea-royal", name: "Royal Procession", homeActors: genActors(405, 60), swingActors: genActors(406, 15) },
      { id: "rptea-jester", name: "Jester Performance", homeActors: genActors(407, 20), swingActors: genActors(408, 5) },
      { id: "rptea-guard", name: "Castle Guard", homeActors: genActors(409, 71), swingActors: genActors(410, 18) },
    ]},
    { id: "pl", name: "PL", roles: [
      { id: "pl-main", name: "Main Stage Cast", homeActors: genActors(501, 25), swingActors: genActors(502, 6) },
      { id: "pl-street", name: "Street Performers", homeActors: genActors(503, 20), swingActors: genActors(504, 5) },
      { id: "pl-parade", name: "Parade Lead", homeActors: genActors(505, 15), swingActors: genActors(506, 4) },
      { id: "pl-greet", name: "Meet & Greet", homeActors: genActors(507, 11), swingActors: genActors(508, 3) },
    ]},
  ],
}];

const ALL_SHOWS = DATA.flatMap((l) => l.shows);
function findShow(id: string) { return ALL_SHOWS.find((s) => s.id === id) ?? null; }
function findRole(showId: string, roleId: string) { return findShow(showId)?.roles.find((r) => r.id === roleId) ?? null; }

// ── List-view Mock Performers ──────────────────────────────────────────────

const SHOW_ROLE_PAIRS = [
  { showId: "uop", show: "UOP", role: "Parade Wushu" },
  { showId: "uop", show: "UOP", role: "Parade Viper" },
  { showId: "uop", show: "UOP", role: "Dragon Dance" },
  { showId: "uchmmg", show: "UCHMMG", role: "Ollivanders" },
  { showId: "uchmmg", show: "UCHMMG", role: "Conductor" },
  { showId: "uchmmg", show: "UCHMMG", role: "Triwizard Spirit Rally" },
  { showId: "uchmmg", show: "UCHMMG", role: "Frog Choir" },
  { showId: "tsmmg", show: "TSMMG", role: "Raptor Encounter" },
  { showId: "tsmmg", show: "TSMMG", role: "Transformers" },
  { showId: "tsmmg", show: "TSMMG", role: "Po Live" },
  { showId: "rptea", show: "RPTEA", role: "Knights Tournament" },
  { showId: "pl", show: "PL", role: "Main Stage Cast" },
  { showId: "pl", show: "PL", role: "Parade Lead" },
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
  return {
    id: 9000 + seed,
    ssoId: `2001${String(7000 + dHash(seed * 19) % 3000)}`,
    name: pool.name,
    nationality: pool.nationality,
    flag: pool.flag,
    height: 160 + (dHash(seed) % 26),
    weight: 48 + (dHash(seed * 2) % 35),
    photoUrl: `https://randomuser.me/api/portraits/${pool.gender}/${photoNum}.jpg`,
    homeShow: pair.show,
    homeRole: pair.role,
    contractEndDate: CONTRACT_DATES[dHash(seed * 3) % CONTRACT_DATES.length],
    skillsets: [...new Set(skillIndexes.map((i) => ALL_SKILLSETS[i]))],
    mediaFiles,
  };
}

const PERFORMERS: Actor[] = Array.from({ length: 18 }, (_, i) => genPerformer(i + 1));

// ── Preview Modal ──────────────────────────────────────────────────────────

function PreviewModal({ actor, label, onClose }: { actor: Actor; label: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl overflow-hidden w-full max-w-xs shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <img src={actor.photoUrl} alt={actor.name} className="w-full aspect-[4/5] object-cover object-top" />
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 bg-black/40 rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
            <p className="text-xs font-medium text-gray-300">{label}</p>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <p className="font-bold text-gray-900 text-base">{actor.name}</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-gray-400 mb-0.5">国籍</p><p className="text-gray-700">{actor.flag} {actor.nationality}</p></div>
            <div><p className="text-xs text-gray-400 mb-0.5">身高</p><p className="text-gray-700">{actor.height} cm</p></div>
            <div className="col-span-2"><p className="text-xs text-gray-400 mb-0.5">SSO ID</p><p className="font-mono text-gray-800 text-sm">{actor.ssoId}</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Edit Drawer ────────────────────────────────────────────────────────────

function EditDrawer({ actor, label, onClose }: { actor: Actor; label: string; onClose: () => void }) {
  const [name, setName] = useState(actor.name);
  const [height, setHeight] = useState(String(actor.height));
  const [weight, setWeight] = useState(String(actor.weight));
  const [nationality, setNationality] = useState(actor.nationality);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-900">Edit Performer</h3>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex gap-4 items-start">
            <img src={actor.photoUrl} alt={actor.name} className="w-20 h-24 object-cover object-top rounded-xl flex-shrink-0" />
            <div><p className="text-xs text-gray-400 mb-0.5">SSO ID</p><p className="font-mono text-sm text-gray-800">{actor.ssoId}</p></div>
          </div>
          {[["Name", name, setName], ["Nationality", nationality, setNationality]].map(([lbl, val, setter]) => (
            <div key={lbl as string}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{lbl as string}</label>
              <input value={val as string} onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400" />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Height (cm)</label>
              <input type="number" value={height} onChange={(e) => setHeight(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Weight (kg)</label>
              <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
          </div>
        </div>
        <div className="border-t border-gray-100 px-5 py-4 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={onClose} className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors">Save</button>
        </div>
      </div>
    </>
  );
}

// ── Actor Card (card view) ─────────────────────────────────────────────────

function ActorCard({ actor, index, type }: { actor: Actor; index: number; type: "home" | "swing" }) {
  const label = type === "home" ? `Home #${index + 1}` : `Swing #${index + 1}`;
  const [previewing, setPreviewing] = useState(false);
  const [editing, setEditing] = useState(false);
  return (
    <>
      {previewing && <PreviewModal actor={actor} label={label} onClose={() => setPreviewing(false)} />}
      {editing && <EditDrawer actor={actor} label={label} onClose={() => setEditing(false)} />}
      <div className="flex-shrink-0 w-36 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-gray-100">
          <span className="text-xs text-gray-400">{label}</span>
          <button onClick={(e) => { e.stopPropagation(); setEditing(true); }} className="p-0.5 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <Pencil className="w-3 h-3" />
          </button>
        </div>
        <div className="relative w-full cursor-pointer" style={{ paddingBottom: "130%" }} onClick={() => setPreviewing(true)}>
          <img src={actor.photoUrl} alt={actor.name} className="absolute inset-0 w-full h-full object-cover object-top" loading="lazy" />
        </div>
        <div className="px-2.5 py-2.5 text-center">
          <p className="text-xs font-semibold text-gray-900 leading-snug truncate">{actor.name}</p>
          <div className="flex items-center justify-center gap-2 mt-1 text-xs text-gray-400">
            <span>{actor.nationality}</span>
            <span>{actor.height}cm</span>
          </div>
        </div>
      </div>
    </>
  );
}

// ── CAST Dialog ────────────────────────────────────────────────────────────

function CastDialog({ show, role, onClose }: { show: Show; role: Role; onClose: () => void }) {
  const [sso, setSso] = useState("");
  const [type, setType] = useState("home");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Cast</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-5 space-y-5">
          <p className="text-sm text-gray-500">Cast performer for <span className="text-blue-500 font-medium">{show.name} / {role.name}</span></p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">SSO</label>
              <input type="text" value={sso} onChange={(e) => setSso(e.target.value)} placeholder="如有多个请用空格分隔"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 placeholder:text-gray-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 text-gray-700">
                <option value="home">Home Role</option>
                <option value="swing">Swing Role</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 pb-5">
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={onClose} className="px-5 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors">Confirm</button>
        </div>
      </div>
    </div>
  );
}

// ── Lightbox ───────────────────────────────────────────────────────────────

function Lightbox({ files, initialIndex, onClose }: { files: MediaFile[]; initialIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(initialIndex);
  const file = files[idx];
  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center" onClick={onClose}>
      <button
        onClick={(e) => { e.stopPropagation(); setIdx((i) => Math.max(0, i - 1)); }}
        disabled={idx === 0}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white disabled:opacity-30 transition-colors"
      >
        <ChevronRight className="w-5 h-5 rotate-180" />
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
      <button
        onClick={(e) => { e.stopPropagation(); setIdx((i) => Math.min(files.length - 1, i + 1)); }}
        disabled={idx === files.length - 1}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white disabled:opacity-30 transition-colors"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
      <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors">
        <X className="w-5 h-5" />
      </button>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-gray-400">{idx + 1} / {files.length}</div>
    </div>
  );
}

// ── Photo Gallery ──────────────────────────────────────────────────────────

function PhotoGallery({ files }: { files: MediaFile[] }) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  return (
    <>
      {lightboxIdx !== null && <Lightbox files={files} initialIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />}
      <div className="relative">
        <div className="flex gap-2 overflow-x-auto pb-1 scroll-smooth" style={{ scrollbarWidth: "none" }}>
          {files.map((f, i) => (
            <button
              key={i}
              onClick={() => setLightboxIdx(i)}
              className="flex-shrink-0 relative rounded-lg overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity"
              style={{ width: 100, height: 135 }}
            >
              <img src={f.url} alt="" className="w-full h-full object-cover object-top" loading="lazy" />
              {f.type === "video" && (
                <>
                  <div className="absolute inset-0 bg-black/35" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Play className="w-6 h-6 text-white fill-white" />
                  </div>
                  {f.duration && <span className="absolute bottom-1.5 left-1.5 text-xs text-white bg-black/60 px-1 py-0.5 rounded leading-none">{f.duration}</span>}
                </>
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Actor Detail Drawer ────────────────────────────────────────────────────

function ActorDetailDrawer({ actor, onClose, onEdit }: { actor: Actor; onClose: () => void; onEdit: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Performer Detail</h3>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
              <Pencil className="w-3.5 h-3.5" />Edit
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {/* Basic info */}
          <div className="p-5 flex gap-4 border-b border-gray-100">
            <img src={actor.photoUrl} alt={actor.name} className="w-24 h-28 object-cover object-top rounded-xl flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <p className="font-bold text-gray-900 text-base leading-snug">{actor.name}</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                <div><span className="text-xs text-gray-400 block">SSO</span><span className="font-mono text-gray-800 text-xs">{actor.ssoId}</span></div>
                <div><span className="text-xs text-gray-400 block">Nationality</span><span className="text-gray-700 text-xs">{actor.flag} {actor.nationality}</span></div>
                <div><span className="text-xs text-gray-400 block">Height</span><span className="text-gray-700 text-xs">{actor.height} cm</span></div>
                <div><span className="text-xs text-gray-400 block">Weight</span><span className="text-gray-700 text-xs">{actor.weight} kg</span></div>
              </div>
              {actor.homeShow && (
                <div className="pt-0.5">
                  <span className="text-xs text-gray-400 block">Home Show / Role</span>
                  <span className="text-xs text-blue-600 font-medium">{actor.homeShow} / {actor.homeRole}</span>
                </div>
              )}
            </div>
          </div>

          {/* Skillsets */}
          {actor.skillsets && actor.skillsets.length > 0 && (
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Skillset</p>
              <div className="flex flex-wrap gap-1.5">
                {actor.skillsets.map((s) => (
                  <span key={s} className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Photo Gallery */}
          {actor.mediaFiles && actor.mediaFiles.length > 0 && (
            <div className="px-5 py-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Photo & Video Gallery</p>
              <PhotoGallery files={actor.mediaFiles} />
            </div>
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
          <h2 className="font-semibold text-gray-900">Upload Performer</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-5 grid grid-cols-2 gap-4">
          {([
            ["SSO", "sso", "text", "e.g. 20017233"],
            ["Full Name", "name", "text", "e.g. Arthur William Bennett"],
            ["Nationality", "nationality", "text", "e.g. British"],
          ] as [string, keyof typeof form, string, string][]).map(([lbl, key, type, ph]) => (
            <div key={key} className={key === "name" ? "col-span-2" : ""}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{lbl} <span className="text-red-400">*</span></label>
              <input type={type} value={form[key]} onChange={(e) => set(key, e.target.value)} placeholder={ph}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 placeholder:text-gray-300" />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Height (cm) <span className="text-red-400">*</span></label>
            <input type="number" value={form.height} onChange={(e) => set("height", e.target.value)} placeholder="e.g. 176"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-gray-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Weight (kg) <span className="text-red-400">*</span></label>
            <input type="number" value={form.weight} onChange={(e) => set("weight", e.target.value)} placeholder="e.g. 60"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-gray-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Home Show <span className="text-red-400">*</span></label>
            <select value={form.homeShow} onChange={(e) => set("homeShow", e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 text-gray-700">
              <option value="">选择</option>
              {allShowNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Home Role <span className="text-red-400">*</span></label>
            <select value={form.homeRole} onChange={(e) => set("homeRole", e.target.value)} disabled={!form.homeShow}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 text-gray-700 disabled:opacity-50">
              <option value="">选择</option>
              {selectedShowRoles.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 pb-5">
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={onClose} disabled={!valid} className="px-5 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Confirm</button>
        </div>
      </div>
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
      {active ? (sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-blue-500" /> : <ArrowDown className="w-3 h-3 text-blue-500" />) : <ArrowUpDown className="w-3 h-3" />}
    </button>
  );
}

function ListView({
  performers,
  filterPerformer, setFilterPerformer,
  filterShow, setFilterShow,
  filterRole, setFilterRole,
  filterEventExp, setFilterEventExp,
  filterStatus, setFilterStatus,
  onFilterChange,
  onReset,
  onUpload,
}: {
  performers: Actor[];
  filterPerformer: string; setFilterPerformer: (v: string) => void;
  filterShow: string; setFilterShow: (v: string) => void;
  filterRole: string; setFilterRole: (v: string) => void;
  filterEventExp: string; setFilterEventExp: (v: string) => void;
  filterStatus: string; setFilterStatus: (v: string) => void;
  onFilterChange: () => void;
  onReset: () => void;
  onUpload: () => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [detailActor, setDetailActor] = useState<Actor | null>(null);
  const [editActor, setEditActor] = useState<Actor | null>(null);

  const allShowNames = DATA.flatMap((l) => l.shows).map((s) => s.name);
  const rolesForShow = DATA.flatMap((l) => l.shows).find((s) => s.name === filterShow)?.roles.map((r) => r.name) ?? [];

  function handleSort(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("asc"); }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return performers;
    return [...performers].sort((a, b) => {
      const av = sortKey === "contractEndDate" ? (a.contractEndDate ?? "") : (a[sortKey] ?? 0);
      const bv = sortKey === "contractEndDate" ? (b.contractEndDate ?? "") : (b[sortKey] ?? 0);
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [performers, sortKey, sortDir]);

  function wrap(setter: (v: string) => void) {
    return (v: string) => { setter(v); onFilterChange(); };
  }

  return (
    <div className="flex flex-col h-full">
      {detailActor && !editActor && (
        <ActorDetailDrawer actor={detailActor} onClose={() => setDetailActor(null)} onEdit={() => setEditActor(detailActor)} />
      )}
      {editActor && (
        <EditDrawer actor={editActor} label={`${editActor.homeShow ?? ""} / ${editActor.homeRole ?? ""}`} onClose={() => setEditActor(null)} />
      )}

      {/* Filter bar */}
      <div className="bg-white border-b border-gray-200 px-5 py-3.5 flex items-end gap-3 flex-wrap">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-xs text-gray-500">Performer</span>
          <input value={filterPerformer} onChange={(e) => wrap(setFilterPerformer)(e.target.value)} placeholder="输入SSO/姓名"
            className="h-8 px-2.5 border border-gray-200 rounded-lg text-sm w-40 focus:outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-gray-300" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Current Home Show/Role</span>
          <div className="flex gap-1.5">
            <select value={filterShow} onChange={(e) => { wrap(setFilterShow)(e.target.value); setFilterRole(""); }}
              className="h-8 px-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 text-gray-700 w-28">
              <option value="">选择</option>
              {allShowNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <select value={filterRole} onChange={(e) => wrap(setFilterRole)(e.target.value)} disabled={!filterShow}
              className="h-8 px-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 text-gray-700 w-36 disabled:opacity-50">
              <option value="">选择</option>
              {rolesForShow.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Event Experience</span>
          <select value={filterEventExp} onChange={(e) => wrap(setFilterEventExp)(e.target.value)}
            className="h-8 px-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 text-gray-700 w-28">
            <option value="">请选择</option>
            <option>0-1 year</option><option>1-3 years</option><option>3-5 years</option><option>5+ years</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Status</span>
          <select value={filterStatus} onChange={(e) => wrap(setFilterStatus)(e.target.value)}
            className="h-8 px-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 text-gray-700 w-28">
            <option value="">请选择</option>
            <option>Active</option><option>On Leave</option><option>Terminated</option>
          </select>
        </div>
        <div className="flex items-end gap-2 pb-0.5">
          <button onClick={onReset} className="h-8 px-4 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">Reset</button>
          <button className="h-8 px-4 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">Search</button>
        </div>
      </div>

      {/* Upload button + table */}
      <div className="flex-1 overflow-y-auto p-5">
        <button onClick={onUpload} className="mb-4 flex items-center gap-1.5 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
          <Upload className="w-4 h-4" />Upload
        </button>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500 bg-gray-50/50">
                <th className="w-10 px-4 py-3" />
                <th className="text-left px-4 py-3 font-semibold">Full Name</th>
                <th className="text-left px-4 py-3 font-semibold">SSO</th>
                <th className="text-left px-4 py-3 font-semibold">Nationality</th>
                <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">
                  Height <SortBtn col="height" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">
                  Weight <SortBtn col="weight" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="text-left px-4 py-3 font-semibold">Home Show</th>
                <th className="text-left px-4 py-3 font-semibold">Home Role</th>
                <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">
                  Contract End Date <SortBtn col="contractEndDate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="text-left px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr><td colSpan={10} className="text-center py-12 text-gray-300 text-sm">No performers found</td></tr>
              )}
              {sorted.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <img src={p.photoUrl} alt={p.name} className="w-8 h-8 rounded-full object-cover object-top" />
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{p.name}</td>
                  <td className="px-4 py-3 font-mono text-gray-600 text-xs">{p.ssoId}</td>
                  <td className="px-4 py-3 text-gray-600">{p.nationality}</td>
                  <td className="px-4 py-3 text-gray-600">{p.height}</td>
                  <td className="px-4 py-3 text-gray-600">{p.weight}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.homeShow ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.homeRole ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.contractEndDate ?? "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button onClick={() => setEditActor(p)} className="text-blue-500 hover:text-blue-700 text-xs font-medium mr-3 transition-colors">Edit</button>
                    <button onClick={() => setDetailActor(p)} className="text-blue-500 hover:text-blue-700 text-xs font-medium transition-colors">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function CastingBookPage() {
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [expandedLands, setExpandedLands] = useState<Set<string>>(new Set(["ftp"]));
  const [expandedShows, setExpandedShows] = useState<Set<string>>(new Set());
  const [selectedShowId, setSelectedShowId] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [castTab, setCastTab] = useState<"home" | "swing">("home");
  const [showCastDialog, setShowCastDialog] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // List-view filter state
  const [filterPerformer, setFilterPerformer] = useState("");
  const [filterShow, setFilterShow] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterEventExp, setFilterEventExp] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const selectedShow = useMemo(() => (selectedShowId ? findShow(selectedShowId) : null), [selectedShowId]);
  const selectedRole = useMemo(() => (selectedShowId && selectedRoleId ? findRole(selectedShowId, selectedRoleId) : null), [selectedShowId, selectedRoleId]);
  const actors = useMemo(() => (selectedRole ? (castTab === "home" ? selectedRole.homeActors : selectedRole.swingActors) : []), [selectedRole, castTab]);

  // Filtered performers for list view
  const filteredPerformers = useMemo(() => {
    // Sidebar selection takes precedence
    if (selectedShowId && selectedRoleId && selectedShow && selectedRole) {
      return PERFORMERS.filter((p) => p.homeShow === selectedShow.name && p.homeRole === selectedRole.name);
    }
    let result = PERFORMERS;
    if (filterPerformer) {
      const q = filterPerformer.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q) || p.ssoId.includes(q));
    }
    if (filterShow) result = result.filter((p) => p.homeShow === filterShow);
    if (filterRole) result = result.filter((p) => p.homeRole === filterRole);
    return result;
  }, [selectedShowId, selectedRoleId, selectedShow, selectedRole, filterPerformer, filterShow, filterRole]);

  function toggleLand(id: string) {
    setExpandedLands((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  function toggleShow(id: string) {
    setExpandedShows((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  function selectRole(showId: string, roleId: string) {
    setSelectedShowId(showId);
    setSelectedRoleId(roleId);
    setCastTab("home");
    // clear list filters when sidebar changes
    setFilterPerformer(""); setFilterShow(""); setFilterRole(""); setFilterEventExp(""); setFilterStatus("");
  }

  function handleFilterChange() {
    // clear sidebar when filter changes
    setSelectedShowId(null); setSelectedRoleId(null);
  }

  function handleReset() {
    setFilterPerformer(""); setFilterShow(""); setFilterRole(""); setFilterEventExp(""); setFilterStatus("");
    setSelectedShowId(null); setSelectedRoleId(null);
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 flex-shrink-0 h-14 px-5 flex items-center justify-between z-30">
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-5 h-5 text-gray-600" />
          <span className="font-bold text-gray-900">Casting Book</span>
        </div>
        <button
          onClick={() => setViewMode((m) => (m === "card" ? "list" : "card"))}
          title={viewMode === "card" ? "Switch to list view" : "Switch to card view"}
          className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-blue-50 text-blue-500" : "hover:bg-gray-100 text-gray-500 hover:text-gray-800"}`}
        >
          {viewMode === "card" ? <List className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
        </button>
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Left Sidebar */}
        <aside className="w-52 flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
          {DATA.map((land) => {
            const landExpanded = expandedLands.has(land.id);
            return (
              <div key={land.id}>
                <button onClick={() => toggleLand(land.id)} className="w-full flex items-center gap-2 px-3 py-3 hover:bg-gray-50 text-left">
                  <Users className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span className="text-sm font-semibold text-blue-600 flex-1 truncate leading-snug">{land.label}</span>
                  {landExpanded ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                </button>
                {landExpanded && land.shows.map((show) => {
                  const showExpanded = expandedShows.has(show.id);
                  const showHome = show.roles.reduce((s, r) => s + r.homeActors.length, 0);
                  return (
                    <div key={show.id}>
                      <button onClick={() => toggleShow(show.id)} className="w-full flex items-center pl-7 pr-3 py-2 hover:bg-gray-50 text-left">
                        <span className="text-sm text-gray-800 flex-1 min-w-0 truncate">
                          {show.name}<span className="text-gray-400 text-xs ml-0.5">({showHome})</span>
                        </span>
                        {showExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
                      </button>
                      {showExpanded && show.roles.map((role) => {
                        const active = selectedRoleId === role.id && selectedShowId === show.id;
                        return (
                          <button key={role.id} onClick={() => selectRole(show.id, role.id)}
                            className={`w-full flex items-center pl-11 pr-3 py-1.5 text-left transition-colors ${active ? "bg-blue-50 hover:bg-blue-50" : "hover:bg-gray-50"}`}>
                            <span className={`text-xs truncate flex-1 leading-snug ${active ? "text-blue-600 font-medium" : "text-gray-500"}`}>
                              {role.name}<span className={`ml-0.5 ${active ? "text-blue-400" : "text-gray-400"}`}>({role.homeActors.length})</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </aside>

        {/* Right Content */}
        {viewMode === "card" ? (
          <div className="flex-1 min-w-0 overflow-y-auto flex flex-col bg-gray-50 relative">
            {selectedRole && selectedShow ? (
              <div className="p-6 flex-1">
                <p className="text-sm text-gray-400 mb-4">{selectedShow.name} / {selectedRole.name}</p>
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <div className="flex items-center gap-4 mb-5">
                    {(["home", "swing"] as const).map((t) => (
                      <button key={t} onClick={() => setCastTab(t)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${castTab === t ? "bg-gray-100 text-gray-900" : "text-gray-400 hover:text-gray-700"}`}>
                        {t === "home" ? "HOME CAST" : "Swing CAST"}
                        <span className="text-xs font-semibold">{t === "home" ? selectedRole.homeActors.length : selectedRole.swingActors.length}</span>
                      </button>
                    ))}
                  </div>
                  {actors.length > 0 ? (
                    <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
                      {actors.map((actor, i) => <ActorCard key={actor.id} actor={actor} index={i} type={castTab} />)}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-300 py-8">No actors in this {castTab === "home" ? "Home" : "Swing"} cast</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-gray-400">请选择 show &amp; Role</p>
              </div>
            )}
            {selectedRole && (
              <button onClick={() => setShowCastDialog(true)}
                className="fixed bottom-8 right-8 w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center text-xs font-bold tracking-wide hover:bg-blue-600 active:scale-95 transition-all z-20">
                CAST
              </button>
            )}
          </div>
        ) : (
          <div className="flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden">
            <ListView
              performers={filteredPerformers}
              filterPerformer={filterPerformer} setFilterPerformer={setFilterPerformer}
              filterShow={filterShow} setFilterShow={setFilterShow}
              filterRole={filterRole} setFilterRole={setFilterRole}
              filterEventExp={filterEventExp} setFilterEventExp={setFilterEventExp}
              filterStatus={filterStatus} setFilterStatus={setFilterStatus}
              onFilterChange={handleFilterChange}
              onReset={handleReset}
              onUpload={() => setShowUploadModal(true)}
            />
          </div>
        )}
      </div>

      {showCastDialog && selectedShow && selectedRole && (
        <CastDialog show={selectedShow} role={selectedRole} onClose={() => setShowCastDialog(false)} />
      )}
      {showUploadModal && <UploadModal onClose={() => setShowUploadModal(false)} />}
    </div>
  );
}
