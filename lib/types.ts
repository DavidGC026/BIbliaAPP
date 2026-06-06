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
  updated_time?: number
  created_time?: number
}

export interface HealthStatus {
  mysql: { ok: boolean; message: string }
  joplin: { ok: boolean; message: string }
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
