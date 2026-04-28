"use client";
import { useState, useEffect } from "react";
import { NOTE_TAGS } from "@/types";

interface NoteEditorProps {
  value: string;
  onChange: (v: string) => void;
}

export default function NoteEditor({ value, onChange }: NoteEditorProps) {
  const [custom, setCustom] = useState("");

  useEffect(() => {
    // parse custom text from value (text not in NOTE_TAGS)
    const tagPart = NOTE_TAGS.filter((t) => value.includes(t)).join("、");
    const customPart = value.replace(tagPart, "").replace(/^[、\s]+|[、\s]+$/g, "");
    setCustom(customPart);
  }, []);

  const selectedTags = NOTE_TAGS.filter((t) => value.includes(t));

  function toggleTag(tag: string) {
    const tags = NOTE_TAGS.filter((t) => value.includes(t));
    const next = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
    const combined = [...next, custom].filter(Boolean).join("、");
    onChange(combined);
  }

  function handleCustomChange(v: string) {
    setCustom(v);
    const tags = NOTE_TAGS.filter((t) => value.includes(t));
    const combined = [...tags, v].filter(Boolean).join("、");
    onChange(combined);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {NOTE_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTag(tag)}
            className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
              selectedTags.includes(tag)
                ? "bg-blue-500 text-white border-blue-500"
                : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
      <input
        type="text"
        value={custom}
        onChange={(e) => handleCustomChange(e.target.value)}
        placeholder="自定义备注..."
        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-400"
      />
    </div>
  );
}
