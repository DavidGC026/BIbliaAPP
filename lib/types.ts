export interface Book {
  bookId: number
  bookName: string
  chapters: number
}

export interface BibleVersion {
  bibleId: number
  abbr: string
  name: string
  license?: string | null
  copyright?: string | null
  attribution?: string | null
  sourceUrl?: string | null
  catalogScope?: "public" | "internal"
  canRead?: boolean
  canDownload?: boolean
  canCopy?: boolean
  canShare?: boolean
  canCreateImages?: boolean
  canUseAudio?: boolean
  cacheMaxAgeDays?: number | null
}

export interface Verse {
  id: number
  bookId: number
  bookName: string
  chapter: number
  verse: number
  text: string
}

export interface NoteLink {
  id: number
  bookId: number
  chapter: number
  verse: number
  noteContent?: string
  createdAt: string
}

export interface JoplinNote {
  id: string
  title: string
  body: string
  updated_time?: number
  created_time?: number
}

export interface HealthStatus {
  mysql: { ok: boolean; message: string }
}

export interface Notebook {
  id: number
  name: string
  createdAt: string
}

export interface NotebookNote {
  id: number
  notebookId: number
  title: string
  content: string
  createdAt: string
  updatedAt: string
}
