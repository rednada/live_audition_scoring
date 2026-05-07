/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useMemo } from "react";
import {
  BookOpen, X, Pencil, Upload, Play, ChevronDown,
  ArrowUp, ArrowDown, ArrowUpDown, LayoutGrid, List, Table2,
  Search, RotateCcw, Eye, Users, Film,
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
    id: 9000 + seed, ssoId: `2001${String(7000 + dHash(seed * 19) % 3000)}`,
    name: pool.name, nationality: pool.nationality, flag: pool.flag,
    height: 160 + (dHash(seed) % 26), weight: 48 + (dHash(seed * 2) % 35),
    photoUrl: `https://randomuser.me/api/portraits/${pool.gender}/${photoNum}.jpg`,
    homeShow: pair.show, homeRole: pair.role,
    contractEndDate: CONTRACT_DATES[dHash(seed * 3) % CONTRACT_DATES.length],
    skillsets: [...new Set(skillIndexes.map((i) => ALL_SKILLSETS[i]))],
    mediaFiles,
  };
}

const PERFORMERS: Actor[] = Array.from({ length: 28 }, (_, i) => genPerformer(i + 1));

const ALL_SHOWS = DATA.flatMap((l) => l.shows);
function findShow(id: string) { return ALL_SHOWS.find((s) => s.id === id) ?? null; }
function findRole(showId: string, roleId: string) { return findShow(showId)?.roles.find((r) => r.id === roleId) ?? null; }

// ── Lightbox ───────────────────────────────────────────────────────────────

function Lightbox({ files, initialIndex, onClose }: { files: MediaFile[]; initialIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(initialIndex);
  const file = files[idx];
  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center" onClick={onClose}>
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

// ── Actor Profile Drawer ───────────────────────────────────────────────────

function ActorProfileDrawer({ actor, roleLabel, onClose, onEdit }: { actor: Actor; roleLabel: string; onClose: () => void; onEdit: () => void }) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const files = actor.mediaFiles ?? [];

  return (
    <>
      {lightboxIdx !== null && <Lightbox files={files} initialIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[420px] bg-white shadow-2xl flex flex-col">
        {/* Photo header */}
        <div className="relative flex-shrink-0 h-64 bg-gray-100">
          <img src={actor.photoUrl} alt={actor.name} className="w-full h-full object-cover object-top" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-4 left-5 right-5">
            <p className="text-xs text-gray-300 mb-0.5">{roleLabel}</p>
            <p className="text-xl font-bold text-white leading-tight">{actor.name}</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Stats row */}
          <div className="flex border-b border-gray-100">
            {[
              { label: "SSO", value: actor.ssoId, mono: true },
              { label: "Nationality", value: `${actor.flag} ${actor.nationality}` },
              { label: "Height", value: `${actor.height} cm` },
              { label: "Weight", value: `${actor.weight} kg` },
            ].map(({ label, value, mono }) => (
              <div key={label} className="flex-1 px-4 py-3 text-center border-r border-gray-100 last:border-r-0">
                <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                <p className={`text-sm font-semibold text-gray-800 ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Home show */}
          {actor.homeShow && (
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Home Show / Role</p>
                <p className="text-sm font-semibold text-indigo-600">{actor.homeShow} / {actor.homeRole}</p>
              </div>
              {actor.contractEndDate && (
                <div className="text-right">
                  <p className="text-xs text-gray-400 mb-0.5">Contract End</p>
                  <p className="text-sm text-gray-700">{actor.contractEndDate}</p>
                </div>
              )}
            </div>
          )}

          {/* Skillsets */}
          {actor.skillsets && actor.skillsets.length > 0 && (
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">Skillset</p>
              <div className="flex flex-wrap gap-1.5">
                {actor.skillsets.map((s) => (
                  <span key={s} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full font-medium">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Media gallery */}
          {files.length > 0 && (
            <div className="px-5 py-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Media</p>
              <div className="grid grid-cols-3 gap-2">
                {files.map((f, i) => (
                  <button key={i} onClick={() => setLightboxIdx(i)}
                    className="relative rounded-xl overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity aspect-[3/4]">
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
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-gray-100 px-5 py-4 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">Close</button>
          <button onClick={onEdit} className="flex-1 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 transition-colors flex items-center justify-center gap-1.5">
            <Pencil className="w-3.5 h-3.5" />Edit
          </button>
        </div>
      </div>
    </>
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
      <div className="fixed inset-0 z-[55] bg-black/30" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-[60] w-full max-w-sm bg-white shadow-2xl flex flex-col">
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
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            {[["Height (cm)", height, setHeight], ["Weight (kg)", weight, setWeight]].map(([lbl, val, setter]) => (
              <div key={lbl as string}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{lbl as string}</label>
                <input type="number" value={val as string} onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-gray-100 px-5 py-4 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={onClose} className="flex-1 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 transition-colors">Save</button>
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

// ── Performer Card (grid view) ─────────────────────────────────────────────

function PerformerCard({ actor, index, type }: { actor: Actor; index: number; type: "home" | "swing" }) {
  const label = type === "home" ? `Home #${index + 1}` : `Swing #${index + 1}`;
  const [showProfile, setShowProfile] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  return (
    <>
      {showProfile && !showEdit && (
        <ActorProfileDrawer actor={actor} roleLabel={label} onClose={() => setShowProfile(false)} onEdit={() => { setShowProfile(false); setShowEdit(true); }} />
      )}
      {showEdit && <EditDrawer actor={actor} label={label} onClose={() => setShowEdit(false)} />}

      <div className="group relative bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
        {/* Position badge */}
        <div className="absolute top-2 left-2 z-10">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${type === "home" ? "bg-indigo-500 text-white" : "bg-amber-400 text-amber-900"}`}>
            {type === "home" ? `H${index + 1}` : `S${index + 1}`}
          </span>
        </div>

        {/* Edit button */}
        <button onClick={(e) => { e.stopPropagation(); setShowEdit(true); }}
          className="absolute top-2 right-2 z-10 w-6 h-6 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
          <Pencil className="w-3 h-3" />
        </button>

        {/* Photo */}
        <div className="relative w-full cursor-pointer" style={{ paddingBottom: "133%" }} onClick={() => setShowProfile(true)}>
          <img src={actor.photoUrl} alt={actor.name} className="absolute inset-0 w-full h-full object-cover object-top" loading="lazy" />
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow">
              <Eye className="w-4 h-4 text-gray-700" />
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="px-3 py-2.5">
          <p className="text-xs font-bold text-gray-900 leading-snug truncate">{actor.name}</p>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
            <span>{actor.flag}</span>
            <span>{actor.height}cm</span>
            <span className="text-gray-300">·</span>
            <span>{actor.weight}kg</span>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Card View ──────────────────────────────────────────────────────────────

function CardView({
  selectedShow, selectedRole, castTab, setCastTab, onCast,
}: {
  selectedShow: Show | null;
  selectedRole: Role | null;
  castTab: "home" | "swing";
  setCastTab: (t: "home" | "swing") => void;
  onCast: () => void;
}) {
  if (!selectedShow || !selectedRole) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-300">
        <Film className="w-12 h-12" />
        <p className="text-sm">Select a show and role to view the cast</p>
      </div>
    );
  }

  const actors = castTab === "home" ? selectedRole.homeActors : selectedRole.swingActors;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-6 pt-5 pb-6">
        {/* Role header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">{selectedShow.name}</p>
            <h2 className="text-lg font-bold text-gray-900">{selectedRole.name}</h2>
          </div>
          <button onClick={onCast}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 transition-colors shadow-sm">
            <Users className="w-4 h-4" />Assign Cast
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl w-fit mb-6">
          {(["home", "swing"] as const).map((t) => {
            const count = t === "home" ? selectedRole.homeActors.length : selectedRole.swingActors.length;
            return (
              <button key={t} onClick={() => setCastTab(t)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${castTab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                {t === "home" ? "Home Cast" : "Swing Cast"}
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${castTab === t ? (t === "home" ? "bg-indigo-100 text-indigo-600" : "bg-amber-100 text-amber-700") : "bg-gray-200 text-gray-500"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Grid */}
        {actors.length === 0 ? (
          <p className="text-sm text-gray-300 py-8 text-center">No {castTab === "home" ? "home" : "swing"} cast assigned</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-3">
            {actors.map((actor, i) => <PerformerCard key={actor.id} actor={actor} index={i} type={castTab} />)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Roster Overview View ───────────────────────────────────────────────────

function RosterView({ show, onRoleClick }: { show: Show | null; onRoleClick: (roleId: string) => void }) {
  if (!show) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-300">
        <Table2 className="w-12 h-12" />
        <p className="text-sm">Select a show to view the roster overview</p>
      </div>
    );
  }

  const totalHome = show.roles.reduce((s, r) => s + r.homeActors.length, 0);
  const totalSwing = show.roles.reduce((s, r) => s + r.swingActors.length, 0);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-6 pt-5 pb-6">
        {/* Show header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{show.name}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{show.roles.length} roles · {totalHome} home · {totalSwing} swing</p>
          </div>
        </div>

        {/* Roles table */}
        <div className="space-y-3">
          {show.roles.map((role) => (
            <div key={role.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Role row */}
              <div className="flex items-center gap-4 px-5 py-3.5 border-b border-gray-50">
                <div className="flex-1 min-w-0">
                  <button onClick={() => onRoleClick(role.id)} className="text-sm font-semibold text-gray-900 hover:text-indigo-600 transition-colors text-left">
                    {role.name}
                  </button>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="flex items-center gap-1 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
                    {role.homeActors.length} Home
                  </span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                    {role.swingActors.length} Swing
                  </span>
                </div>
              </div>

              {/* Photo strip — home cast preview */}
              <div className="px-5 py-3 flex items-center gap-2">
                <div className="flex -space-x-2">
                  {role.homeActors.slice(0, 10).map((a, i) => (
                    <img key={i} src={a.photoUrl} alt={a.name}
                      className="w-8 h-8 rounded-full object-cover object-top border-2 border-white"
                      style={{ zIndex: 10 - i }} loading="lazy" />
                  ))}
                  {role.homeActors.length > 10 && (
                    <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                      <span className="text-xs text-gray-500 font-semibold">+{role.homeActors.length - 10}</span>
                    </div>
                  )}
                </div>
                <button onClick={() => onRoleClick(role.id)}
                  className="ml-auto text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors">
                  View all →
                </button>
              </div>
            </div>
          ))}
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
      {active ? (sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-indigo-500" /> : <ArrowDown className="w-3 h-3 text-indigo-500" />) : <ArrowUpDown className="w-3 h-3" />}
    </button>
  );
}

function ListView({ onUpload }: { onUpload: () => void }) {
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [profileActor, setProfileActor] = useState<Actor | null>(null);
  const [editActor, setEditActor] = useState<Actor | null>(null);
  const [q, setQ] = useState("");
  const [filterShow, setFilterShow] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const allShowNames = DATA.flatMap((l) => l.shows).map((s) => s.name);
  const rolesForShow = DATA.flatMap((l) => l.shows).find((s) => s.name === filterShow)?.roles.map((r) => r.name) ?? [];

  function handleSort(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("asc"); }
  }

  const filtered = useMemo(() => {
    let result = PERFORMERS;
    if (q) { const lq = q.toLowerCase(); result = result.filter((p) => p.name.toLowerCase().includes(lq) || p.ssoId.includes(lq)); }
    if (filterShow) result = result.filter((p) => p.homeShow === filterShow);
    if (filterRole) result = result.filter((p) => p.homeRole === filterRole);
    return result;
  }, [q, filterShow, filterRole]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = sortKey === "contractEndDate" ? (a.contractEndDate ?? "") : (a[sortKey] ?? 0);
      const bv = sortKey === "contractEndDate" ? (b.contractEndDate ?? "") : (b[sortKey] ?? 0);
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  function reset() { setQ(""); setFilterShow(""); setFilterRole(""); setFilterStatus(""); setSortKey(null); }

  return (
    <div className="flex flex-col h-full">
      {profileActor && !editActor && (
        <ActorProfileDrawer actor={profileActor}
          roleLabel={`${profileActor.homeShow ?? ""} / ${profileActor.homeRole ?? ""}`}
          onClose={() => setProfileActor(null)}
          onEdit={() => { setEditActor(profileActor); setProfileActor(null); }} />
      )}
      {editActor && (
        <EditDrawer actor={editActor} label={`${editActor.homeShow ?? ""} / ${editActor.homeRole ?? ""}`} onClose={() => setEditActor(null)} />
      )}

      {/* Filter bar */}
      <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="SSO or Name"
            className="h-8 pl-8 pr-3 border border-gray-200 rounded-lg text-sm w-44 focus:outline-none focus:ring-2 focus:ring-indigo-200 placeholder:text-gray-300" />
        </div>

        {/* Show + Role */}
        <select value={filterShow} onChange={(e) => { setFilterShow(e.target.value); setFilterRole(""); }}
          className="h-8 px-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 text-gray-700 w-32">
          <option value="">All Shows</option>
          {allShowNames.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} disabled={!filterShow}
          className="h-8 px-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 text-gray-700 w-40 disabled:opacity-40">
          <option value="">All Roles</option>
          {rolesForShow.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="h-8 px-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 text-gray-700 w-32">
          <option value="">All Status</option>
          <option>Active</option><option>On Leave</option><option>Terminated</option>
        </select>

        <button onClick={reset} className="h-8 w-8 flex items-center justify-center border border-gray-200 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors">
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <span className="text-xs text-gray-400 ml-auto">{sorted.length} performers</span>
        <button onClick={onUpload} className="h-8 flex items-center gap-1.5 px-3 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors">
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
              <th className="text-left px-4 py-3 font-semibold">Home Show / Role</th>
              <th className="text-left px-4 py-3 font-semibold">Skillset</th>
              <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">
                Contract End <SortBtn col="contractEndDate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              </th>
              <th className="text-left px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-50">
            {sorted.length === 0 && (
              <tr><td colSpan={10} className="text-center py-16 text-gray-300 text-sm">No performers found</td></tr>
            )}
            {sorted.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                <td className="px-4 py-3">
                  <img src={p.photoUrl} alt={p.name} className="w-9 h-9 rounded-full object-cover object-top ring-2 ring-white shadow-sm" />
                </td>
                <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{p.name}</td>
                <td className="px-4 py-3 font-mono text-gray-500 text-xs">{p.ssoId}</td>
                <td className="px-4 py-3 text-gray-600">{p.flag} {p.nationality}</td>
                <td className="px-4 py-3 text-gray-600">{p.height} cm</td>
                <td className="px-4 py-3 text-gray-600">{p.weight} kg</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                  {p.homeShow ? <><span className="font-medium text-indigo-600">{p.homeShow}</span> / {p.homeRole}</> : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(p.skillsets ?? []).slice(0, 3).map((s) => (
                      <span key={s} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{s}</span>
                    ))}
                    {(p.skillsets?.length ?? 0) > 3 && <span className="text-xs text-gray-400">+{(p.skillsets?.length ?? 0) - 3}</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{p.contractEndDate ?? "—"}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <button onClick={() => setEditActor(p)} className="text-xs text-gray-500 hover:text-gray-800 font-medium mr-3 transition-colors">Edit</button>
                  <button onClick={() => setProfileActor(p)} className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

type ViewMode = "card" | "roster" | "list";

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
  const selectedRole = useMemo(() => (selectedRoleId ? selectedShow?.roles.find((r) => r.id === selectedRoleId) ?? null : null), [selectedShow, selectedRoleId]);

  function selectShow(showId: string) {
    setSelectedShowId(showId);
    setSelectedRoleId(null);
    setCastTab("home");
  }

  function selectRole(roleId: string) {
    setSelectedRoleId(roleId);
    setCastTab("home");
    if (viewMode === "roster") setViewMode("card");
  }

  const showTotalHome = selectedShow?.roles.reduce((s, r) => s + r.homeActors.length, 0) ?? 0;
  const showTotalSwing = selectedShow?.roles.reduce((s, r) => s + r.swingActors.length, 0) ?? 0;

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 flex-shrink-0 h-14 px-5 flex items-center justify-between z-30">
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-5 h-5 text-indigo-500" />
          <span className="font-bold text-gray-900 text-base">Casting Book</span>
        </div>

        {/* Land selector */}
        <div className="flex items-center gap-1 ml-6">
          {DATA.map((l) => (
            <button key={l.id} onClick={() => { setSelectedLandId(l.id); setSelectedShowId(l.shows[0].id); setSelectedRoleId(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedLandId === l.id ? "bg-indigo-50 text-indigo-700" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}>
              {l.label}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>

        {/* View mode toggle */}
        <div className="ml-auto flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
          {([
            ["card", "Cards", LayoutGrid],
            ["roster", "Roster", Table2],
            ["list", "Performers", List],
          ] as [ViewMode, string, React.ElementType][]).map(([mode, label, Icon]) => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === mode ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Show & Role nav (hidden in list mode) ── */}
      {viewMode !== "list" && (
        <div className="bg-white border-b border-gray-100 flex-shrink-0">
          {/* Show tabs */}
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

          {/* Role pills */}
          {selectedShow && (
            <div className="px-5 pb-3 pt-2 flex items-center gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {/* Show-level "All" option for roster view */}
              {viewMode === "roster" && (
                <button onClick={() => setSelectedRoleId(null)}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${selectedRoleId === null ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  All Roles
                  <span className={`text-xs ml-0.5 ${selectedRoleId === null ? "text-gray-300" : "text-gray-400"}`}>{showTotalHome}+{showTotalSwing}</span>
                </button>
              )}
              {selectedShow.roles.map((role) => {
                const active = selectedRoleId === role.id;
                return (
                  <button key={role.id} onClick={() => selectRole(role.id)}
                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${active ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    {role.name}
                    <span className={`text-xs ml-0.5 ${active ? "text-indigo-200" : "text-gray-400"}`}>{role.homeActors.length}+{role.swingActors.length}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {viewMode === "card" && (
          <CardView
            selectedShow={selectedShow}
            selectedRole={selectedRole}
            castTab={castTab}
            setCastTab={setCastTab}
            onCast={() => setShowCastDialog(true)}
          />
        )}
        {viewMode === "roster" && (
          <RosterView show={selectedShow} onRoleClick={selectRole} />
        )}
        {viewMode === "list" && (
          <ListView onUpload={() => setShowUploadModal(true)} />
        )}
      </div>

      {showCastDialog && selectedShow && selectedRole && (
        <CastDialog show={selectedShow} role={selectedRole} onClose={() => setShowCastDialog(false)} />
      )}
      {showUploadModal && <UploadModal onClose={() => setShowUploadModal(false)} />}
    </div>
  );
}
