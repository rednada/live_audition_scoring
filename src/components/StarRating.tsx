"use client";
import { Star } from "lucide-react";

interface StarRatingProps {
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
  size?: number;
}

export default function StarRating({ value, onChange, readOnly, size = 20 }: StarRatingProps) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(star)}
          className={readOnly ? "cursor-default" : "cursor-pointer hover:scale-110 transition-transform"}
        >
          <Star
            size={size}
            className={star <= value ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
          />
        </button>
      ))}
      {value > 0 && (
        <span className="ml-1 text-sm text-gray-500 self-center">{value}分</span>
      )}
    </div>
  );
}
