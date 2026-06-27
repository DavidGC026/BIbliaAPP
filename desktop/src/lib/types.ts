export interface User {
  id: number;
  name: string;
  email: string;
  username: string | null;
  role: string;
  allowedSections?: string | string[] | null;
  streakCount?: number;
}

export interface VerseOfDay {
  theme: string;
  reference: string;
  text: string;
  idBook: number;
  chapter: number;
  verse_start: number;
  verse_end: number;
  idBible: number;
  backgroundImage?: string | null;
}

export interface ChurchSettings {
  church_name: string;
  church_logo_url?: string | null;
}

export interface ApiError {
  error?: string;
  code?: string;
}
