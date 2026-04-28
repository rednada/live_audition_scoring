export type PhotoType =
  | "front_half"
  | "left_half"
  | "right_half"
  | "left_full"
  | "right_full"
  | "tattoo";

export const PHOTO_LABELS: Record<PhotoType, string> = {
  front_half: "正面半身",
  left_half: "左侧半身",
  right_half: "右侧半身",
  left_full: "左侧全身",
  right_full: "右侧全身",
  tattoo: "纹身照片",
};

export const REQUIRED_PHOTOS: PhotoType[] = [
  "front_half",
  "left_half",
  "right_half",
  "left_full",
  "right_full",
];

export const NOTE_TAGS = [
  "形象好",
  "表演自然",
  "身材好",
  "气质佳",
  "反应快",
  "肢体协调",
  "有经验",
  "声音好",
  "偏胖",
  "偏瘦",
  "年龄偏大",
  "年龄偏小",
  "待观察",
  "不合适",
];

export const AUDITION_STAGES = ["Preliminary", "Call Back"] as const;
export type AuditionStage = (typeof AUDITION_STAGES)[number];

export interface ActorWithPhotos {
  id: number;
  auditionNumber: string;
  name: string;
  phone: string;
  height: number;
  weight: number;
  hasTattoo: boolean;
  sessionId: number;
  stage: string;
  checkinTime: string;
  photos: { type: string; filePath: string }[];
}

export interface ScoreData {
  stars: number;
  house?: string;
  role?: string;
  note?: string;
}

export interface DirectorScore extends ScoreData {
  directorId: number;
  directorName: string;
  submittedAt?: string;
}
