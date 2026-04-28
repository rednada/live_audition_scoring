"use client";
import { useState, useEffect } from "react";
import useSWR from "swr";
import QRCode from "qrcode";
import Image from "next/image";

interface QREntry {
  id: number;
  code: string;
  stage: string;
  isActive: boolean;
  session: { id: number; name: string; date: string; category: string };
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function QRCodesPage() {
  const { data: qrCodes } = useSWR<QREntry[]>("/api/qrcodes", fetcher);
  const [qrImages, setQrImages] = useState<Record<string, string>>({});

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    if (!qrCodes) return;
    Promise.all(
      qrCodes.map(async (qr) => {
        const url = `${origin}/checkin/${qr.code}`;
        const dataUrl = await QRCode.toDataURL(url, { width: 200, margin: 1 });
        return [qr.code, dataUrl] as [string, string];
      })
    ).then((pairs) => {
      setQrImages(Object.fromEntries(pairs));
    });
  }, [qrCodes, origin]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-xl font-semibold text-gray-800 mb-6">二维码管理</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {qrCodes?.map((qr) => (
          <div
            key={qr.id}
            className={`bg-white rounded-lg border p-4 text-center ${
              qr.isActive ? "border-gray-200" : "border-red-200 opacity-60"
            }`}
          >
            {qrImages[qr.code] && (
              <div className="flex justify-center mb-2">
                <Image
                  src={qrImages[qr.code]}
                  alt={`QR ${qr.code}`}
                  width={160}
                  height={160}
                />
              </div>
            )}
            <div className="text-xs text-gray-600 font-medium mb-0.5">
              {qr.session.name}
            </div>
            <div className="text-xs text-gray-500">{qr.session.date}</div>
            <div className="text-xs text-blue-600 mt-0.5">{qr.stage}</div>
            {!qr.isActive && (
              <div className="text-xs text-red-500 mt-1">已停用</div>
            )}
            <div className="mt-2">
              <a
                href={`${origin}/checkin/${qr.code}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:underline break-all"
              >
                {`/checkin/${qr.code}`}
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
