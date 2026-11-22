import type { ReactNode } from "react";

interface IconProps {
  size?: number;
  className?: string;
}

function Svg({
  size = 16,
  className,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function MinimizeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 8h10" />
    </Svg>
  );
}

export function MaximizeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.2" y="3.2" width="9.6" height="9.6" rx="1.4" />
    </Svg>
  );
}

export function RestoreIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="2.6" y="5.4" width="8" height="8" rx="1.1" />
      <path d="M5.4 5.4V4.3c0-.6.5-1.1 1.1-1.1h5.2c.6 0 1.1.5 1.1 1.1v5.2c0 .6-.5 1.1-1.1 1.1h-1.1" />
    </Svg>
  );
}

export function FilesIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 2.5h6l3 3v8H3z" />
      <path d="M9 2.5v3h3" />
    </Svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="7" cy="7" r="4.2" />
      <path d="M10.2 10.2 14 14" />
    </Svg>
  );
}

export function GitBranchIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="4.5" cy="3.5" r="1.6" />
      <circle cx="4.5" cy="12.5" r="1.6" />
      <circle cx="11.5" cy="6" r="1.6" />
      <path d="M4.5 5.1v5.8" />
      <path d="M11.5 7.6c0 2.4-2.4 3.2-5.2 3.8" />
    </Svg>
  );
}

export function BugIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="5" y="5" width="6" height="8" rx="3" />
      <path d="M5 8H2.8M13.2 8H11M5.4 5.6 3.8 4.2M10.6 5.6l1.6-1.4M5 11l-2 1.2M11 11l2 1.2M8 5V3.2" />
    </Svg>
  );
}

export function PythonIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 1.8c-2.2 0-3.4.8-3.4 2.4v1.4h4.8v.8H3.7c-1.3 0-2.2 1-2.2 3.1 0 2 .9 3.1 2.2 3.1h1.2v-1.7c0-1.7 1.1-2.6 2.6-2.6h3.2c1.3 0 2.3-1 2.3-2.4V4.2C12.9 2.6 11.4 1.8 8 1.8Z" />
      <circle cx="6.2" cy="3.5" r=".6" fill="currentColor" stroke="none" />
      <path d="M8 14.2c2.2 0 3.4-.8 3.4-2.4v-1.4H6.6v-.8h5.7c1.3 0 2.2-1 2.2-3.1 0-2-.9-3.1-2.2-3.1h-1.2v1.7c0 1.7-1.1 2.6-2.6 2.6H5.3c-1.3 0-2.3 1-2.3 2.4v1.7c0 1.6 1.5 2.4 5 2.4Z" />
      <circle cx="9.8" cy="12.5" r=".6" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="8" cy="8" r="2.2" />
      <path d="M8 1.8v1.6M8 12.6v1.6M1.8 8h1.6M12.6 8h1.6M3.6 3.6l1.1 1.1M11.3 11.3l1.1 1.1M12.4 3.6l-1.1 1.1M4.7 11.3l-1.1 1.1" />
    </Svg>
  );
}

export function TerminalIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="1.8" y="2.8" width="12.4" height="10.4" rx="1.4" />
      <path d="m4.4 6 2.2 2-2.2 2M8.6 10h3" />
    </Svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 2.8 13 8l-8.5 5.2z" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function StopIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.6" y="3.6" width="8.8" height="8.8" rx="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function BuildIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m9.5 2.4 4.1 4.1-1.6 1.6-1.2-1.2-4.8 4.8 1.2 1.2-1.6 1.6-4.1-4.1 1.6-1.6 1.2 1.2 4.8-4.8L8 4z" />
      <path d="m11.5 10.5 2.3 2.3" />
    </Svg>
  );
}

export function SaveIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2.8 2.8h8.4l2 2v8.4H2.8z" />
      <path d="M5 2.8v3.4h5V2.8M5 13.2V9.5h6v3.7" />
    </Svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 3v10M3 8h10" />
    </Svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m4 4 8 8M12 4l-8 8" />
    </Svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m6 3.5 4.5 4.5L6 12.5" />
    </Svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m3.5 6 4.5 4.5L12.5 6" />
    </Svg>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M13 8a5 5 0 1 1-1.6-3.7" />
      <path d="M13 2.8V6h-3.2" />
    </Svg>
  );
}

export function FolderIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2 4.2h4.2l1.2 1.5h6.6v7.1H2z" />
    </Svg>
  );
}

export function FolderOpenIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2 4.2h4.2l1.2 1.5h6.6v1.6H4L2 12.8z" />
      <path d="M4 12.8 6 7.3h8.5l-2 5.5z" />
    </Svg>
  );
}

export function FileIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 2h5l3 3v9H4z" />
      <path d="M9 2v3h3" />
    </Svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.7 9h5.6l.7-9M6.7 7v4.2M9.3 7v4.2" />
    </Svg>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m10.5 2.8 2.7 2.7L5.5 13.2H2.8v-2.7z" />
    </Svg>
  );
}

export function NewFileIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 2h5l3 3v6.2M9.5 2v3h3" />
      <path d="M8 9.5v4M6 11.5h4" />
    </Svg>
  );
}

export function NewFolderIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2 4.2h4.2l1.2 1.5h6.6v6.8H2z" />
      <path d="M8 8v3.2M6.4 9.6h3.2" />
    </Svg>
  );
}

export function ErrorIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="8" cy="8" r="5.8" />
      <path d="M8 4.6v4.2M8 11.2v.2" />
    </Svg>
  );
}

export function WarningIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 2.2 14 13H2z" />
      <path d="M8 6.2v3.2M8 11.4v.2" />
    </Svg>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="8" cy="8" r="5.8" />
      <path d="M8 7.2v4M8 4.8v.2" />
    </Svg>
  );
}

export function PanelRightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="1.8" y="2.8" width="12.4" height="10.4" rx="1.2" />
      <path d="M10 2.8v10.4" />
    </Svg>
  );
}

export function PanelBottomIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="1.8" y="2.8" width="12.4" height="10.4" rx="1.2" />
      <path d="M1.8 9.5h12.4" />
    </Svg>
  );
}

export function StepOverIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 4a5 5 0 0 1 9 3" />
      <path d="m10 4.5 2.5 2.5L15 4.5" transform="translate(-2.5 0)" />
      <path d="M3.5 12.5h9" />
    </Svg>
  );
}

export function StepIntoIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 4.5a5 5 0 0 1 8.4-1.6" />
      <path d="M12 8V2.5M9.5 5 12 2.5 14.5 5" />
      <path d="M8 8v5M5.5 10.5 8 13l2.5-2.5" />
    </Svg>
  );
}

export function StepOutIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 11.5a5 5 0 0 1 8.4 1.6" />
      <path d="M12 8v5.5M9.5 11 12 13.5l2.5-2.5" />
      <path d="M8 12.5v-5M5.5 10 8 7.5 10.5 10" />
    </Svg>
  );
}

export function ContinueIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 3.2 11.2 8 4 12.8z" fill="currentColor" stroke="none" />
      <path d="M12.8 3.2v9.6" />
    </Svg>
  );
}

export function BreakpointIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="8" cy="8" r="4" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function PackageIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m8 1.8 5.5 3v6.4L8 14.2l-5.5-3V4.8z" />
      <path d="m2.5 4.8 5.5 3 5.5-3M8 7.8v6.4" />
    </Svg>
  );
}

export function CommandIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 2.5a1.5 1.5 0 1 0 0 3h6a1.5 1.5 0 1 1 0 3H5a1.5 1.5 0 1 1 0-3h6a1.5 1.5 0 1 0 0-3z" />
    </Svg>
  );
}

export function GlobeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="8" cy="8" r="5.8" />
      <path d="M2.2 8h11.6M8 2.2c1.8 1.6 2.7 3.6 2.7 5.8S9.8 12.2 8 13.8C6.2 12.2 5.3 10.2 5.3 8S6.2 3.8 8 2.2Z" />
    </Svg>
  );
}
