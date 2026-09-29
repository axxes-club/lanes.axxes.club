/**
 * Icons.
 *
 * Hand-rolled rather than pulled from a package: the set is small, the whole
 * app is dark-first, and an icon library is a lot of bytes to ship for the
 * twenty-odd glyphs below. Every icon inherits `currentColor` and sizes from
 * the `size` prop, so they compose with text.
 */

import type { SVGProps } from "react"

export type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Svg({ size = 16, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  )
}

const p = (d: string) => <path d={d} />

export const IconBoard = (x: IconProps) => <Svg {...x}>{p("M3 5h18v14H3z")}{p("M9 5v14M15 5v14")}</Svg>

export const IconList = (x: IconProps) => (
  <Svg {...x}>
    {p("M8 6h13M8 12h13M8 18h13")}
    {p("M3.5 6h.01M3.5 12h.01M3.5 18h.01")}
  </Svg>
)

export const IconTable = (x: IconProps) => (
  <Svg {...x}>
    {p("M3 5h18v14H3z")}
    {p("M3 10h18M9 10v9")}
  </Svg>
)

export const IconCalendar = (x: IconProps) => (
  <Svg {...x}>
    {p("M3 6h18v15H3z")}
    {p("M3 11h18M8 3v5M16 3v5")}
  </Svg>
)

export const IconChart = (x: IconProps) => <Svg {...x}>{p("M4 20V10M10 20V4M16 20v-7M22 20H2")}</Svg>

export const IconCard = (x: IconProps) => (
  <Svg {...x}>
    {p("M4 5h16v14H4z")}
    {p("M4 10h16M8 15h4")}
  </Svg>
)

export const IconSearch = (x: IconProps) => (
  <Svg {...x}>
    {p("M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z")}
    {p("m21 21-4.35-4.35")}
  </Svg>
)

export const IconPlus = (x: IconProps) => <Svg {...x}>{p("M12 5v14M5 12h14")}</Svg>
export const IconClose = (x: IconProps) => <Svg {...x}>{p("M18 6 6 18M6 6l12 12")}</Svg>
export const IconCheck = (x: IconProps) => <Svg {...x}>{p("m20 6-11 11-5-5")}</Svg>
export const IconChevronDown = (x: IconProps) => <Svg {...x}>{p("m6 9 6 6 6-6")}</Svg>
export const IconChevronRight = (x: IconProps) => <Svg {...x}>{p("m9 6 6 6-6 6")}</Svg>
export const IconChevronLeft = (x: IconProps) => <Svg {...x}>{p("m15 6-6 6 6 6")}</Svg>
export const IconArrowRight = (x: IconProps) => <Svg {...x}>{p("M4 12h16m-6-6 6 6-6 6")}</Svg>
export const IconArrowLeft = (x: IconProps) => <Svg {...x}>{p("M20 12H4m6 6-6-6 6-6")}</Svg>
export const IconArrowUp = (x: IconProps) => <Svg {...x}>{p("M12 20V4m-6 6 6-6 6 6")}</Svg>
export const IconArrowDown = (x: IconProps) => <Svg {...x}>{p("M12 4v16m6-6-6 6-6-6")}</Svg>

export const IconExternal = (x: IconProps) => (
  <Svg {...x}>
    {p("M14 4h6v6")}
    {p("M20 4 11 13")}
    {p("M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5")}
  </Svg>
)

export const IconSettings = (x: IconProps) => (
  <Svg {...x}>
    {p("M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z")}
    {p("M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z")}
  </Svg>
)

export const IconUsers = (x: IconProps) => (
  <Svg {...x}>
    {p("M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20")}
    {p("M9 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z")}
    {p("M22 20v-1.5a4 4 0 0 0-3-3.85")}
    {p("M16 3.6a4 4 0 0 1 0 7.75")}
  </Svg>
)

export const IconUser = (x: IconProps) => (
  <Svg {...x}>
    {p("M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2")}
    {p("M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z")}
  </Svg>
)

export const IconBolt = (x: IconProps) => <Svg {...x}>{p("M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5z")}</Svg>

export const IconSparkle = (x: IconProps) => (
  <Svg {...x}>
    {p("M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8")}
  </Svg>
)

export const IconTag = (x: IconProps) => (
  <Svg {...x}>
    {p("M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-8.2-8.2A2 2 0 0 1 2 11V4a2 2 0 0 1 2-2h7a2 2 0 0 1 1.4.6l8.2 8.2a2 2 0 0 1 0 2.6z")}
    {p("M7 7h.01")}
  </Svg>
)

export const IconClock = (x: IconProps) => <Svg {...x}>{p("M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2")}</Svg>

export const IconFlag = (x: IconProps) => (
  <Svg {...x}>
    {p("M4 15s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1z")}
    {p("M4 22V4")}
  </Svg>
)

export const IconBell = (x: IconProps) => (
  <Svg {...x}>
    {p("M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9")}
    {p("M13.7 21a2 2 0 0 1-3.4 0")}
  </Svg>
)

export const IconCommand = (x: IconProps) => (
  <Svg {...x}>{p("M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6z")}</Svg>
)

export const IconBook = (x: IconProps) => (
  <Svg {...x}>
    {p("M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z")}
    {p("M4 19.5A2.5 2.5 0 0 1 6.5 17H20")}
  </Svg>
)

export const IconCode = (x: IconProps) => <Svg {...x}>{p("m16 18 6-6-6-6M8 6l-6 6 6 6")}</Svg>
export const IconTerminal = (x: IconProps) => <Svg {...x}>{p("m4 17 6-5-6-5M12 19h8")}</Svg>

export const IconGrid = (x: IconProps) => (
  <Svg {...x}>{p("M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z")}</Svg>
)

export const IconRocket = (x: IconProps) => (
  <Svg {...x}>
    {p("M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2 0-2.7-.8-.7-2-.7-3 .7z")}
    {p("m12 15-3-3a22 22 0 0 1 2-3.9A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.7-6 11a22.4 22.4 0 0 1-4 2z")}
    {p("M9 12H4s.6-3.3 2-4c1.6-.8 5 0 5 0M12 15v5s3.3-.6 4-2c.8-1.6 0-5 0-5")}
  </Svg>
)

export const IconSun = (x: IconProps) => (
  <Svg {...x}>
    {p("M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z")}
    {p("M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4")}
  </Svg>
)

export const IconMoon = (x: IconProps) => <Svg {...x}>{p("M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z")}</Svg>
export const IconMonitor = (x: IconProps) => <Svg {...x}>{p("M3 4h18v12H3zM8 20h8M12 16v4")}</Svg>

export const IconTrash = (x: IconProps) => (
  <Svg {...x}>
    {p("M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5")}
  </Svg>
)

export const IconCopy = (x: IconProps) => (
  <Svg {...x}>
    {p("M9 9h11v11H9z")}
    {p("M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1")}
  </Svg>
)

export const IconLink = (x: IconProps) => (
  <Svg {...x}>
    {p("M10 13a5 5 0 0 0 7.5.5l3-3A5 5 0 0 0 13.5 3.4l-1.7 1.7")}
    {p("M14 11a5 5 0 0 0-7.5-.5l-3 3A5 5 0 0 0 10.5 20.6l1.7-1.7")}
  </Svg>
)

export const IconDownload = (x: IconProps) => <Svg {...x}>{p("M12 3v12m-5-5 5 5 5-5M4 21h16")}</Svg>
export const IconUpload = (x: IconProps) => <Svg {...x}>{p("M12 15V3m-5 5 5-5 5 5M4 21h16")}</Svg>
export const IconFilter = (x: IconProps) => <Svg {...x}>{p("M3 5h18l-7 8v6l-4 2v-8z")}</Svg>
export const IconSort = (x: IconProps) => <Svg {...x}>{p("M7 4v16m0 0-3-3m3 3 3-3M17 20V4m0 0-3 3m3-3 3 3")}</Svg>

export const IconMore = (x: IconProps) => (
  <Svg {...x}>
    {[12, 5, 19].map((cy) => (
      <circle key={cy} cx="12" cy={cy} r="1.4" fill="currentColor" stroke="none" />
    ))}
  </Svg>
)

export const IconDrag = (x: IconProps) => (
  <Svg {...x} strokeWidth={2}>
    {[9, 15].flatMap((cx) =>
      [6, 12, 18].map((cy) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.2" fill="currentColor" stroke="none" />
      )),
    )}
  </Svg>
)

export const IconInfo = (x: IconProps) => (
  <Svg {...x}>
    {p("M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z")}
    {p("M12 11v5M12 7.5h.01")}
  </Svg>
)

export const IconWarning = (x: IconProps) => (
  <Svg {...x}>
    {p("M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z")}
    {p("M12 9v4M12 17h.01")}
  </Svg>
)

export const IconCheckCircle = (x: IconProps) => (
  <Svg {...x}>
    {p("M21.5 11.1V12a9.5 9.5 0 1 1-5.6-8.7")}
    {p("m21.5 4.5-9.6 9.6-3.8-3.8")}
  </Svg>
)

export const IconPlay = (x: IconProps) => <Svg {...x}>{p("m6 3 14 9-14 9z")}</Svg>
export const IconRefresh = (x: IconProps) => <Svg {...x}>{p("M21 12a9 9 0 1 1-3-6.7L21 8")}{p("M21 3v5h-5")}</Svg>

export const IconStar = (x: IconProps) => (
  <Svg {...x}>{p("m12 3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9z")}</Svg>
)

export const IconKey = (x: IconProps) => <Svg {...x}>{p("M14 7a4 4 0 1 1-3.9 5H8v3H5v3H2v-3l7.1-7.1A4 4 0 0 1 14 7z")}</Svg>

export const IconWebhook = (x: IconProps) => (
  <Svg {...x}>
    {p("M9 8.5a3 3 0 1 1 5.6 1.5l1.4 2.4a3 3 0 1 1-1.2 1.6H9.4A3 3 0 0 1 9 8.5z")}
    {p("M6 12a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM18 12a3 3 0 1 1 0 6 3 3 0 0 1 0-6z")}
  </Svg>
)

export const IconPuzzle = (x: IconProps) => (
  <Svg {...x}>
    {p("M9 3h4a1 1 0 0 1 1 1v1a2 2 0 1 0 4 0V4a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v4h-1a2 2 0 1 0 0 4h1v4a1 1 0 0 1-1 1h-4v-1a2 2 0 1 0-4 0v1H8a1 1 0 0 1-1-1v-4H6a2 2 0 1 0 0-4h1V4a1 1 0 0 1 1-1z")}
  </Svg>
)

export const IconStack = (x: IconProps) => (
  <Svg {...x}>
    {p("m12 2 9 5-9 5-9-5z")}
    {p("m3 12 9 5 9-5M3 17l9 5 9-5")}
  </Svg>
)

export const IconTarget = (x: IconProps) => (
  <Svg {...x}>
    {p("M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z")}
    {p("M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z")}
    {p("M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z")}
  </Svg>
)

export const IconInbox = (x: IconProps) => (
  <Svg {...x}>
    {p("M3 12h5l2 3h4l2-3h5")}
    {p("M5.5 5h13l2.5 7v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z")}
  </Svg>
)

export const IconHash = (x: IconProps) => <Svg {...x}>{p("M5 9h14M5 15h14M10 3 8 21M16 3l-2 18")}</Svg>

export const IconLayers = (x: IconProps) => (
  <Svg {...x}>
    {p("m12 2 9 5-9 5-9-5z")}
    {p("m3 17 9 5 9-5M3 12l9 5 9-5")}
  </Svg>
)

export const IconMenu = (x: IconProps) => <Svg {...x}>{p("M3 6h18M3 12h18M3 18h18")}</Svg>

export const IconShield = (x: IconProps) => (
  <Svg {...x}>
    {p("M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5z")}
    {p("m9 12 2 2 4-4")}
  </Svg>
)

export const IconGlobe = (x: IconProps) => (
  <Svg {...x}>
    {p("M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z")}
    {p("M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z")}
  </Svg>
)

export const IconEye = (x: IconProps) => (
  <Svg {...x}>
    {p("M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z")}
    {p("M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z")}
  </Svg>
)

export const IconLock = (x: IconProps) => (
  <Svg {...x}>
    {p("M5 11h14v10H5z")}
    {p("M8 11V7a4 4 0 0 1 8 0v4")}
  </Svg>
)

export const IconPalette = (x: IconProps) => (
  <Svg {...x}>
    {p("M12 21a9 9 0 1 1 0-18c4.97 0 9 3.58 9 8 0 2.5-2 3.5-4 3.5h-2a2 2 0 0 0-1.5 3.3A1.8 1.8 0 0 1 12 21z")}
    {p("M7.5 11.5h.01M10 7.5h.01M14.5 7.5h.01")}
  </Svg>
)

/* Aliases, so a feature can import the name that reads best. */
export const IconZap = IconBolt
export const IconApps = IconGrid
export const IconHelp = IconInfo
export const IconFlow = IconLayers
export const IconView = IconBoard
