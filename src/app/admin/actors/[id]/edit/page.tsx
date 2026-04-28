/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  Save,
  X,
  Plus,
  Trash2,
  Upload,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type EmploymentStatus = "active" | "resigned" | "transferred";

interface MainInfo {
  fullName: string;
  ssoId: string;
  nationality: string;
  height: number;
  weight: number;
  currentShow: string;
  currentRole: string;
  employmentStatus: EmploymentStatus;
  photoUrl: string;
}

interface HomeRole {
  showName: string;
  role: string;
}

interface SwingRole {
  id: string;
  showName: string;
  role: string;
}

interface Experience {
  id: string;
  eventName: string;
  year: number;
  role: string;
}

interface PhotoEntry {
  id: string;
  filename: string;
  uploadTime: string;
  operator: string;
  url: string;
}

interface ActorDetail {
  mainInfo: MainInfo;
  homeRole: HomeRole;
  swingRoles: SwingRole[];
  skillTags: string[];
  experiences: Experience[];
  photos: PhotoEntry[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PRESET_TAGS = [
  "Ballet", "Contemporary Dance", "Jazz", "Tap", "Hip-Hop",
  "Acrobatics", "Aerial Silk", "Stilt Walking", "Fire Dancing",
  "Percussion", "Lead Singing", "Harmonies", "Character Work",
  "Physical Comedy", "Stage Combat", "Mandarin Speaking",
  "Cantonese Speaking", "Japanese Speaking",
];

const STATUS_CONFIG: Record<EmploymentStatus, { label: string; cls: string }> = {
  active:      { label: "在职", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  resigned:    { label: "离职", cls: "bg-gray-100 text-gray-500 border-gray-200" },
  transferred: { label: "转出", cls: "bg-blue-50 text-blue-600 border-blue-200" },
};

// ── Mock Data ─────────────────────────────────────────────────────────────────

const MOCK_ACTOR: ActorDetail = {
  mainInfo: {
    fullName: "Alvin Yang Chao 杨超",
    ssoId: "102847",
    nationality: "China 🇨🇳",
    height: 178,
    weight: 72,
    currentShow: "Show A",
    currentRole: "Prince Charming",
    employmentStatus: "active",
    photoUrl: "https://randomuser.me/api/portraits/men/32.jpg",
  },
  homeRole: { showName: "Show A", role: "Prince Charming" },
  swingRoles: [
    { id: "s1", showName: "Show B", role: "Supporting Lead" },
    { id: "s2", showName: "Show F", role: "Ensemble Lead" },
  ],
  skillTags: ["Ballet", "Contemporary Dance", "Acrobatics", "Mandarin Speaking"],
  experiences: [
    { id: "e1", eventName: "Grand Opening Gala", year: 2023, role: "Principal Dancer" },
    { id: "e2", eventName: "CNY Celebration 2024", year: 2024, role: "Lead Character" },
    { id: "e3", eventName: "Summer Spectacular", year: 2024, role: "Featured Performer" },
  ],
  photos: [
    { id: "p1", filename: "front_half.jpg",   uploadTime: "2024-03-15 14:32", operator: "Alice Chen", url: "https://randomuser.me/api/portraits/men/32.jpg" },
    { id: "p2", filename: "left_half.jpg",    uploadTime: "2024-03-15 14:33", operator: "Alice Chen", url: "https://randomuser.me/api/portraits/men/33.jpg" },
    { id: "p3", filename: "right_half.jpg",   uploadTime: "2024-03-15 14:34", operator: "Alice Chen", url: "https://randomuser.me/api/portraits/men/34.jpg" },
    { id: "p4", filename: "left_full.jpg",    uploadTime: "2024-03-20 09:15", operator: "Bob Wang",   url: "https://randomuser.me/api/portraits/men/35.jpg" },
    { id: "p5", filename: "right_full.jpg",   uploadTime: "2024-03-20 09:17", operator: "Bob Wang",   url: "https://randomuser.me/api/portraits/men/36.jpg" },
    { id: "p6", filename: "headshot_2024.jpg", uploadTime: "2024-04-01 11:00", operator: "Alice Chen", url: "https://randomuser.me/api/portraits/men/37.jpg" },
  ],
};

// ── Small helpers ─────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

const inputCls =
  "w-full px-3 py-2 text-sm border border-gray-200 rounded-xl " +
  "focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-400 bg-white";

// ── Reusable UI atoms ─────────────────────────────────────────────────────────

function SectionCard({
  title,
  badge,
  action,
  children,
}: {
  title: string;
  badge?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-sm font-semibold text-gray-900 flex-shrink-0">{title}</h2>
          {badge && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full whitespace-nowrap">
              {badge}
            </span>
          )}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function PlaceholderSection({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-gray-200 overflow-hidden opacity-60">
      <div className="px-5 py-3.5 flex items-center gap-2">
        <h2 className="text-sm font-semibold text-gray-400">{title}</h2>
        <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full flex-shrink-0">未来版本</span>
      </div>
      <div className="px-5 pb-4 text-xs text-gray-300">{description}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <div className="text-sm font-medium text-gray-800">{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ActorEditPage() {
  const [actor, setActor] = useState<ActorDetail>(MOCK_ACTOR);
  const [draft, setDraft] = useState<ActorDetail>(MOCK_ACTOR);
  const [isEditing, setIsEditing] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [newSwing, setNewSwing] = useState({ showName: "", role: "" });

  const data = isEditing ? draft : actor;
  const photos = data.photos;
  const statusCfg = STATUS_CONFIG[data.mainInfo.employmentStatus];

  function startEdit() {
    setDraft(JSON.parse(JSON.stringify(actor)));
    setIsEditing(true);
  }
  function cancelEdit() { setIsEditing(false); }
  function saveEdit()   { setActor(draft); setIsEditing(false); }

  function patchMain(p: Partial<MainInfo>) {
    setDraft((d) => ({ ...d, mainInfo: { ...d.mainInfo, ...p } }));
  }
  function patchHome(p: Partial<HomeRole>) {
    setDraft((d) => ({ ...d, homeRole: { ...d.homeRole, ...p } }));
  }
  function addSwing() {
    if (!newSwing.showName.trim() || !newSwing.role.trim()) return;
    setDraft((d) => ({ ...d, swingRoles: [...d.swingRoles, { id: uid(), ...newSwing }] }));
    setNewSwing({ showName: "", role: "" });
  }
  function removeSwing(id: string) {
    setDraft((d) => ({ ...d, swingRoles: d.swingRoles.filter((r) => r.id !== id) }));
  }
  function updateSwing(id: string, p: Partial<SwingRole>) {
    setDraft((d) => ({
      ...d,
      swingRoles: d.swingRoles.map((r) => (r.id === id ? { ...r, ...p } : r)),
    }));
  }
  function toggleTag(tag: string) {
    setDraft((d) => {
      const has = d.skillTags.includes(tag);
      return { ...d, skillTags: has ? d.skillTags.filter((t) => t !== tag) : [...d.skillTags, tag] };
    });
  }

  // ── Lightbox ────────────────────────────────────────────────────────────────

  const Lightbox = lightboxIdx !== null && (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={() => setLightboxIdx(null)}
    >
      <button
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
        onClick={() => setLightboxIdx(null)}
      >
        <X className="w-6 h-6" />
      </button>

      <button
        className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-white/60 hover:text-white disabled:opacity-20 transition-colors"
        disabled={lightboxIdx === 0}
        onClick={(e) => { e.stopPropagation(); setLightboxIdx((i) => Math.max(0, (i ?? 0) - 1)); }}
      >
        <ChevronLeft className="w-8 h-8" />
      </button>

      <div
        className="flex flex-col items-center gap-4 max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={photos[lightboxIdx].url}
          alt={photos[lightboxIdx].filename}
          className="w-full max-h-[70vh] object-contain rounded-2xl"
        />
        <div className="text-center">
          <p className="text-white text-sm font-semibold">{photos[lightboxIdx].filename}</p>
          <p className="text-white/50 text-xs mt-1">
            {photos[lightboxIdx].uploadTime} · {photos[lightboxIdx].operator}
          </p>
          <p className="text-white/30 text-xs mt-1">{lightboxIdx + 1} / {photos.length}</p>
        </div>
      </div>

      <button
        className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-white/60 hover:text-white disabled:opacity-20 transition-colors"
        disabled={lightboxIdx === photos.length - 1}
        onClick={(e) => { e.stopPropagation(); setLightboxIdx((i) => Math.min(photos.length - 1, (i ?? 0) + 1)); }}
      >
        <ChevronRight className="w-8 h-8" />
      </button>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {Lightbox}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="h-14 px-4 md:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/casting/book" className="text-gray-400 hover:text-gray-700 flex-shrink-0 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="min-w-0">
              <p className="text-xs text-gray-400 hidden sm:block">Casting Book / Actors</p>
              <p className="text-sm font-bold text-gray-900 truncate">{data.mainInfo.fullName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {isEditing ? (
              <>
                <button
                  onClick={cancelEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">取消</span>
                </button>
                <button
                  onClick={saveEdit}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-700 transition-colors shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>保存</span>
                </button>
              </>
            ) : (
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-semibold border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-colors"
              >
                <Pencil className="w-4 h-4" />
                <span>编辑</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 flex flex-col md:flex-row gap-6 items-start">

        {/* Left: sticky profile card */}
        <div className="w-full md:w-56 lg:w-64 flex-shrink-0 md:sticky md:top-[76px]">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="relative">
              <img
                src={data.mainInfo.photoUrl}
                alt={data.mainInfo.fullName}
                className="w-full aspect-[3/4] object-cover object-top"
              />
              {isEditing && (
                <button className="absolute bottom-3 right-3 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="p-4 space-y-3">
              <div>
                <p className="font-bold text-gray-900 text-sm leading-snug">{data.mainInfo.fullName}</p>
                <p className="text-xs text-gray-400 font-mono mt-0.5">SSO {data.mainInfo.ssoId}</p>
              </div>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusCfg.cls}`}>
                {statusCfg.label}
              </span>
              <div className="space-y-1.5 text-xs pt-1 border-t border-gray-100">
                <div className="flex justify-between">
                  <span className="text-gray-400">国籍</span>
                  <span className="text-gray-700">{data.mainInfo.nationality}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">身高</span>
                  <span className="text-gray-700">{data.mainInfo.height} cm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">体重</span>
                  <span className="text-gray-700">{data.mainInfo.weight} kg</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: sections */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* ── 演员主要信息 ──────────────────────────────────────────── */}
          <SectionCard title="演员主要信息">
            {isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Full Name">
                  <input className={inputCls} value={draft.mainInfo.fullName}
                    onChange={(e) => patchMain({ fullName: e.target.value })} />
                </Field>
                <Field label="SSO ID">
                  <input className={inputCls} value={draft.mainInfo.ssoId}
                    onChange={(e) => patchMain({ ssoId: e.target.value })} />
                </Field>
                <Field label="国籍">
                  <input className={inputCls} value={draft.mainInfo.nationality}
                    onChange={(e) => patchMain({ nationality: e.target.value })} />
                </Field>
                <Field label="在职状态">
                  <select className={inputCls} value={draft.mainInfo.employmentStatus}
                    onChange={(e) => patchMain({ employmentStatus: e.target.value as EmploymentStatus })}>
                    <option value="active">在职</option>
                    <option value="resigned">离职</option>
                    <option value="transferred">转出</option>
                  </select>
                </Field>
                <Field label="身高 (cm)">
                  <input type="number" className={inputCls} value={draft.mainInfo.height}
                    onChange={(e) => patchMain({ height: Number(e.target.value) })} />
                </Field>
                <Field label="体重 (kg)">
                  <input type="number" className={inputCls} value={draft.mainInfo.weight}
                    onChange={(e) => patchMain({ weight: Number(e.target.value) })} />
                </Field>
                <Field label="Current Show">
                  <input className={inputCls} value={draft.mainInfo.currentShow}
                    onChange={(e) => patchMain({ currentShow: e.target.value })} />
                </Field>
                <Field label="Current Role">
                  <input className={inputCls} value={draft.mainInfo.currentRole}
                    onChange={(e) => patchMain({ currentRole: e.target.value })} />
                </Field>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
                <InfoRow label="Full Name" value={data.mainInfo.fullName} />
                <InfoRow label="SSO ID" value={<span className="font-mono">{data.mainInfo.ssoId}</span>} />
                <InfoRow label="国籍" value={data.mainInfo.nationality} />
                <InfoRow label="在职状态" value={
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${statusCfg.cls}`}>
                    {statusCfg.label}
                  </span>
                } />
                <InfoRow label="身高" value={`${data.mainInfo.height} cm`} />
                <InfoRow label="体重" value={`${data.mainInfo.weight} kg`} />
                <InfoRow label="Current Show" value={data.mainInfo.currentShow} />
                <InfoRow label="Current Role" value={data.mainInfo.currentRole} />
              </div>
            )}
          </SectionCard>

          {/* ── Show & Role ───────────────────────────────────────────── */}
          <SectionCard title="Show & Role">
            {isEditing ? (
              <div className="space-y-5">
                {/* Home show */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Home Show</p>
                  <div className="grid grid-cols-2 gap-3 bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                    <Field label="Show">
                      <input className={inputCls} placeholder="Show name"
                        value={draft.homeRole.showName}
                        onChange={(e) => patchHome({ showName: e.target.value })} />
                    </Field>
                    <Field label="Role">
                      <input className={inputCls} placeholder="Role name"
                        value={draft.homeRole.role}
                        onChange={(e) => patchHome({ role: e.target.value })} />
                    </Field>
                  </div>
                </div>

                {/* Swing shows */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Swing Shows</p>
                  <div className="space-y-2">
                    {draft.swingRoles.map((sr) => (
                      <div key={sr.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                        <Field label="Show">
                          <input className={inputCls} value={sr.showName}
                            onChange={(e) => updateSwing(sr.id, { showName: e.target.value })} />
                        </Field>
                        <Field label="Role">
                          <input className={inputCls} value={sr.role}
                            onChange={(e) => updateSwing(sr.id, { role: e.target.value })} />
                        </Field>
                        <button
                          onClick={() => removeSwing(sr.id)}
                          className="mb-px p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    {/* Add row */}
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end pt-2 border-t border-gray-100">
                      <Field label="Show">
                        <input className={inputCls} placeholder="Show name"
                          value={newSwing.showName}
                          onChange={(e) => setNewSwing((n) => ({ ...n, showName: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && addSwing()} />
                      </Field>
                      <Field label="Role">
                        <input className={inputCls} placeholder="Role name"
                          value={newSwing.role}
                          onChange={(e) => setNewSwing((n) => ({ ...n, role: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && addSwing()} />
                      </Field>
                      <button
                        onClick={addSwing}
                        disabled={!newSwing.showName.trim() || !newSwing.role.trim()}
                        className="mb-px p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Home Show</p>
                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{data.homeRole.showName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{data.homeRole.role}</p>
                    </div>
                  </div>
                </div>

                {data.swingRoles.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                      Swing Shows
                      <span className="normal-case font-normal text-gray-300 ml-1">({data.swingRoles.length})</span>
                    </p>
                    <div className="space-y-1.5">
                      {data.swingRoles.map((sr) => (
                        <div key={sr.id} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5">
                          <div className="w-2 h-2 rounded-full bg-blue-300 flex-shrink-0" />
                          <p className="text-sm font-medium text-gray-700 flex-1">{sr.showName}</p>
                          <p className="text-xs text-gray-400">{sr.role}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </SectionCard>

          {/* ── Skillset ──────────────────────────────────────────────── */}
          <SectionCard title="Skillset" badge={`${data.skillTags.length} tags`}>
            {isEditing ? (
              <div>
                <p className="text-xs text-gray-400 mb-3">点击标签添加或移除</p>
                <div className="flex flex-wrap gap-2">
                  {PRESET_TAGS.map((tag) => {
                    const active = draft.skillTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          active
                            ? "bg-gray-900 text-white border-gray-900"
                            : "bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {data.skillTags.length === 0 ? (
                  <p className="text-sm text-gray-300">暂无技能标签</p>
                ) : (
                  data.skillTags.map((tag) => (
                    <span key={tag} className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                      {tag}
                    </span>
                  ))
                )}
              </div>
            )}
          </SectionCard>

          {/* ── Experience ────────────────────────────────────────────── */}
          <SectionCard title="Experience" badge="自动生成">
            <p className="text-xs text-gray-400 mb-3">根据 assign role 记录自动生成，不可手动编辑</p>
            {data.experiences.length === 0 ? (
              <p className="text-sm text-gray-300">暂无演出记录</p>
            ) : (
              <div className="space-y-1.5">
                {data.experiences.map((exp) => (
                  <div key={exp.id} className="flex items-center gap-4 px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-xs font-mono text-gray-400 w-10 flex-shrink-0">{exp.year}</span>
                    <p className="text-sm font-medium text-gray-800 flex-1 truncate">{exp.eventName}</p>
                    <span className="text-xs text-gray-500 flex-shrink-0">{exp.role}</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* ── Photo Gallery ─────────────────────────────────────────── */}
          <SectionCard
            title="Photo Gallery"
            badge={`${photos.length} 张`}
            action={
              isEditing ? (
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors flex-shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  上传
                </button>
              ) : undefined
            }
          >
            {photos.length === 0 ? (
              <p className="text-sm text-gray-300">暂无照片</p>
            ) : (
              <>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                  {photos.map((photo, idx) => (
                    <button
                      key={photo.id}
                      onClick={() => setLightboxIdx(idx)}
                      className="group relative rounded-xl overflow-hidden border border-gray-100 hover:border-gray-300 transition-all hover:shadow-sm"
                    >
                      <div className="aspect-[3/4]">
                        <img
                          src={photo.url}
                          alt={photo.filename}
                          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-200"
                          loading="lazy"
                        />
                      </div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors" />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 translate-y-full group-hover:translate-y-0 transition-transform">
                        <p className="text-white text-[10px] truncate leading-tight">{photo.filename}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-3 space-y-1">
                  {photos.map((photo, idx) => (
                    <div
                      key={photo.id}
                      className="flex items-center gap-3 text-xs text-gray-400 hover:text-gray-600 cursor-pointer py-1"
                      onClick={() => setLightboxIdx(idx)}
                    >
                      <span className="w-4 text-gray-300 font-mono">{idx + 1}</span>
                      <span className="text-gray-600 font-medium flex-1 truncate">{photo.filename}</span>
                      <span className="hidden sm:block flex-shrink-0">{photo.uploadTime}</span>
                      <span className="flex-shrink-0">{photo.operator}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </SectionCard>

          {/* ── Future sections (placeholders) ──────────────────────── */}
          <PlaceholderSection
            title="演员状态"
            description="标记演员特殊状态（产假、工伤等），casting 可添加备注"
          />
          <PlaceholderSection
            title="Warning"
            description="记录演员日常演出中的不良行为，用于 performance 管理"
          />
          <PlaceholderSection
            title="量体信息"
            description="Costuming team 定期更新的详细量体数据及试妆记录，支持体重监控预警"
          />
          <PlaceholderSection
            title="合同信息"
            description="从 SF 同步合同开始/结束日期及合同状态，支持到期预警"
          />
          <PlaceholderSection
            title="OJT 记录"
            description="从 SF/UF 同步，仅展示"
          />
        </div>
      </div>
    </div>
  );
}
