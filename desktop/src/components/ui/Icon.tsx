import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "activity"
  | "alert"
  | "bell"
  | "book"
  | "calendar"
  | "chart"
  | "close"
  | "community"
  | "dictionary"
  | "download"
  | "edit"
  | "eye"
  | "file"
  | "heart"
  | "highlighter"
  | "home"
  | "image"
  | "inbox"
  | "notes"
  | "search"
  | "sparkles"
  | "table"
  | "user"
  | "users";

const CONTENT: Record<IconName, ReactNode> = {
  home: (
    <>
      <path d="m3 10.5 9-7.5 9 7.5" />
      <path d="M5 9.5V21h14V9.5M9 21v-7h6v7" />
    </>
  ),
  book: (
    <>
      <path d="M3.5 5.5A3.5 3.5 0 0 1 7 2h5v18H7a3.5 3.5 0 0 0-3.5 2Z" />
      <path d="M20.5 5.5A3.5 3.5 0 0 0 17 2h-5v18h5a3.5 3.5 0 0 1 3.5 2Z" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </>
  ),
  notes: (
    <>
      <path d="M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M8 3v18M11 8h5M11 12h5M11 16h3" />
    </>
  ),
  community: (
    <>
      <path d="M21 13a4 4 0 0 1-4 4H9l-5 4v-4a4 4 0 0 1-2-3.5V8a4 4 0 0 1 4-4h11a4 4 0 0 1 4 4Z" />
      <path d="M7 9h10M7 13h6" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M4 19v2h16v-2" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  file: (
    <>
      <path d="M6 2h8l4 4v16H6Z" />
      <path d="M14 2v5h5M9 12h6M9 16h6" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9" r="1.5" />
      <path d="m21 15-5-5L5 20" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  activity: <path d="M3 12h4l2.5-7 5 14 2.5-7h4" />,
  dictionary: (
    <>
      <path d="M4 4h12a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3Z" />
      <path d="M7 4v16M10 9h6M10 13h4" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3 1.2 3.3L16.5 7.5l-3.3 1.2L12 12l-1.2-3.3-3.3-1.2 3.3-1.2Z" />
      <path d="m18.5 13 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8ZM5.5 14l.7 1.8 1.8.7-1.8.7L5.5 19l-.7-1.8-1.8-.7 1.8-.7Z" />
    </>
  ),
  table: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18M9 4v16M15 4v16" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6M12 17h.01" />
    </>
  ),
  inbox: (
    <>
      <path d="M4 5h16l2 11v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-3Z" />
      <path d="M2 16h5l2 2h6l2-2h5" />
    </>
  ),
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />,
  highlighter: (
    <>
      <path d="m9 11-6 6v4h4l6-6" />
      <path d="m14 4 6 6-7 7-6-6Z" />
      <path d="M14 4l2-2 6 6-2 2M2 22h10" />
    </>
  ),
  close: <path d="M18 6 6 18M6 6l12 12" />,
};

type Props = Omit<SVGProps<SVGSVGElement>, "name"> & {
  name: IconName;
  size?: number;
  strokeWidth?: number;
};

export function Icon({
  name,
  size = 20,
  strokeWidth = 1.8,
  className = "",
  ...props
}: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {CONTENT[name]}
    </svg>
  );
}
