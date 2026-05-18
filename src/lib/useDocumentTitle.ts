"use client";

import { useEffect } from "react";

export default function useDocumentTitle(title: string) {
  useEffect(() => {
    if (!title) return;
    const prev = document.title;
    document.title = title;
    return () => {
      document.title = prev;
    };
  }, [title]);
}
