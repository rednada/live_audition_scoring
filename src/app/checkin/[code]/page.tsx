"use client";
import { useState, useEffect, use } from "react";
import Image from "next/image";
import { Camera, Upload, CheckCircle, AlertCircle } from "lucide-react";
import { PHOTO_LABELS, REQUIRED_PHOTOS, type PhotoType } from "@/types";

interface QRInfo {
  id: number;
  code: string;
  stage: string;
  session: { id: number; name: string; date: string; category: string };
}

type Status = "idle" | "loading" | "success" | "duplicate" | "error";

export default function CheckinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [qrInfo, setQrInfo] = useState<QRInfo | null>(null);
  const [qrError, setQrError] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const [form, setForm] = useState({
    name: "",
    phone: "",
    auditionNumber: "",
    height: "",
    weight: "",
    hasTattoo: false,
  });
  const [photos, setPhotos] = useState<Record<string, File>>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [actorId, setActorId] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/qrcodes?code=${code}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setQrError(data.error);
        else setQrInfo(data);
      })
      .catch(() => setQrError("网络错误，请刷新重试"));
  }, [code]);

  function handlePhotoSelect(type: PhotoType, file: File) {
    setPhotos((prev) => ({ ...prev, [type]: file }));
    setPreviews((prev) => ({ ...prev, [type]: URL.createObjectURL(file) }));
  }

  async function uploadPhotos(id: number) {
    await Promise.all(
      Object.entries(photos).map(async ([type, file]) => {
        const fd = new FormData();
        fd.append("actorId", String(id));
        fd.append("type", type);
        fd.append("file", file);
        await fetch("/api/upload", { method: "POST", body: fd });
      })
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!qrInfo) return;

    // Validate required photos
    const missingPhotos = REQUIRED_PHOTOS.filter((t) => !photos[t]);
    if (missingPhotos.length > 0) {
      alert(`请上传必要照片：${missingPhotos.map((t) => PHOTO_LABELS[t]).join("、")}`);
      return;
    }
    if (form.hasTattoo && !photos["tattoo"]) {
      alert("请上传纹身照片");
      return;
    }

    setStatus("loading");

    const res = await fetch("/api/actors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auditionNumber: form.auditionNumber,
        name: form.name,
        phone: form.phone,
        height: parseInt(form.height),
        weight: parseInt(form.weight),
        hasTattoo: form.hasTattoo,
        sessionId: qrInfo.session.id,
        stage: qrInfo.stage,
      }),
    });

    if (res.status === 409) {
      setStatus("duplicate");
      return;
    }

    if (!res.ok) {
      setStatus("error");
      return;
    }

    const actor = await res.json();
    setActorId(actor.id);

    await uploadPhotos(actor.id);
    setStatus("success");
  }

  if (qrError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="text-center">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-3" />
          <p className="text-gray-600">{qrError}</p>
        </div>
      </div>
    );
  }

  if (!qrInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (status === "success" || status === "duplicate") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="text-center max-w-sm">
          <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {status === "duplicate" ? "您已签到成功" : "签到成功"}
          </h2>
          <p className="text-gray-500 text-sm mb-4">
            {qrInfo.session.name} · {qrInfo.stage}
          </p>
          <a
            href="https://www.universalbeijingresort.com/audition/zh_CN/auditions/schedule"
            className="inline-block bg-blue-500 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-600"
          >
            点击上传至官网
          </a>
        </div>
      </div>
    );
  }

  const photoTypes: PhotoType[] = ["front_half", "left_half", "right_half", "left_full", "right_full"];

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-blue-600 text-white px-4 py-5">
        <h1 className="text-lg font-semibold">甄选信息录入</h1>
        <p className="text-blue-200 text-sm mt-0.5">
          {qrInfo.session.name} · {qrInfo.stage}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* Basic info */}
        {[
          { label: "姓名", key: "name", placeholder: "请输入您的姓名", required: true },
          { label: "手机号", key: "phone", placeholder: "请输入您的手机号", required: true, type: "tel" },
          { label: "甄选号", key: "auditionNumber", placeholder: "请输入甄选编号", required: true },
          { label: "身高 (cm)", key: "height", placeholder: "如：175", required: true, type: "number" },
          { label: "体重 (kg)", key: "weight", placeholder: "如：65", required: true, type: "number" },
        ].map(({ label, key, placeholder, required, type }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {label} {required && <span className="text-red-500">*</span>}
            </label>
            <input
              type={type ?? "text"}
              required={required}
              placeholder={placeholder}
              value={(form as Record<string, string | boolean>)[key] as string}
              onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>
        ))}

        {/* Tattoo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            有无纹身 <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-4">
            {[true, false].map((v) => (
              <label key={String(v)} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="hasTattoo"
                  checked={form.hasTattoo === v}
                  onChange={() => setForm((p) => ({ ...p, hasTattoo: v }))}
                  className="accent-blue-500"
                />
                <span className="text-sm">{v ? "有" : "无"}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Photos */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">照片上传</label>
          <div className="grid grid-cols-3 gap-2">
            {photoTypes.map((type) => (
              <PhotoUploadBox
                key={type}
                type={type}
                label={PHOTO_LABELS[type]}
                preview={previews[type]}
                required
                onSelect={(f) => handlePhotoSelect(type, f)}
              />
            ))}
            {/* Tattoo photo - only show if has tattoo */}
            {form.hasTattoo && (
              <PhotoUploadBox
                type="tattoo"
                label={PHOTO_LABELS.tattoo}
                preview={previews["tattoo"]}
                required={false}
                onSelect={(f) => handlePhotoSelect("tattoo", f)}
              />
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">* 照片为必传项</p>
        </div>

        {status === "error" && (
          <p className="text-red-500 text-sm text-center">提交失败，请重试</p>
        )}

        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {status === "loading" ? "提交中..." : "提交"}
        </button>
      </form>
    </div>
  );
}

function PhotoUploadBox({
  type,
  label,
  preview,
  required,
  onSelect,
}: {
  type: string;
  label: string;
  preview?: string;
  required: boolean;
  onSelect: (f: File) => void;
}) {
  return (
    <label className="cursor-pointer">
      <div className="aspect-square bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center hover:border-blue-400 transition-colors overflow-hidden relative">
        {preview ? (
          <Image src={preview} alt={label} fill className="object-cover" />
        ) : (
          <>
            <Upload size={20} className="text-gray-400 mb-1" />
            <span className="text-xs text-gray-400 text-center px-1">{label}</span>
            {required && <span className="text-xs text-red-400">*</span>}
          </>
        )}
      </div>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelect(file);
        }}
      />
    </label>
  );
}
