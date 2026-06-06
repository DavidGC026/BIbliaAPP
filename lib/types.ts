export interface Book {
  bookId: number
  bookName: string
  chapters: number
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
  joplinNoteId: string
  createdAt: string
}

export interface JoplinNote {
  id: string
  title: string
  body: string
  parent_id?: string
  updated_time?: number
  created_time?: number
}

export interface JoplinFolder {
  id: string
  title: string
  parent_id: string
}

export interface JoplinNoteSummary {
  id: string
  title: string
  updated_time?: number
}

export interface HealthStatus {
  mysql: { ok: boolean; message: string }
  joplin: { ok: boolean; message: string }
}
