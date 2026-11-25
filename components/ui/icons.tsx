import type { SVGProps } from "react";
import {
  ArrowLeft,
  ArrowUp,
  Bell,
  Building,
  Calendar,
  CalendarClock,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  CircleAlert,
  CircleX,
  Clock,
  CreditCard,
  Download,
  Ellipsis,
  Eye,
  EyeOff,
  File,
  Image,
  Info,
  LayoutDashboard,
  ListFilter,
  LocateFixed,
  Lock,
  LogOut,
  MapPin,
  Maximize2,
  Menu,
  Minimize2,
  Minus,
  Monitor,
  Moon,
  Pause,
  PenLine,
  Play,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Shield,
  ShoppingCart,
  Star,
  Sun,
  TriangleAlert,
  Upload,
  User,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * The project's icons. Every glyph is a Lucide icon (`lucide-react`), the icon set the Cheche apps share with
 * bookings_web. The names below stay as the components know them (`PagerNextIcon`, `CheckIcon`…), so nothing that
 * imports them changes; each keeps the guideline's stroke weight for its place (2 by default, 2.5 for pager arrows
 * and steppers, 3 for checkbox and chip marks).
 *
 * Size comes from the caller's CSS (`size-4`, `[&_svg]:size-[18px]`), as before: a CSS size always beats the 24px
 * width and height attributes Lucide writes, and an icon nobody sizes shows at 24px. For an icon not listed here,
 * import it from `lucide-react` directly.
 */

type IconProps = SVGProps<SVGSVGElement>;

function lucide(Icon: LucideIcon, strokeWidth: number, name: string, extra: IconProps = {}) {
  function LucideGlyph(props: IconProps) {
    // The caller's props come last, so a caller can still set its own stroke, size or label.
    return <Icon strokeWidth={strokeWidth} aria-hidden="true" {...extra} {...(props as object)} />;
  }
  LucideGlyph.displayName = name;
  return LucideGlyph;
}

/** Table "View details". */
export const ViewIcon = lucide(Eye, 2, "ViewIcon");

/** Table "Edit". */
export const EditIcon = lucide(PenLine, 2, "EditIcon");

/** The "more" button's three dots. */
export const MoreIcon = lucide(Ellipsis, 2.5, "MoreIcon");

/** Sortable column header arrow (the table turns it for descending). */
export const SortIcon = lucide(ArrowUp, 2.5, "SortIcon");

/** Select trigger chevron. */
export const ChevIcon = lucide(ChevronDown, 2, "ChevIcon");

/** Pager "Previous". */
export const PagerPrevIcon = lucide(ChevronLeft, 2.5, "PagerPrevIcon");

/** Pager "First page". */
export const PagerFirstIcon = lucide(ChevronsLeft, 2.5, "PagerFirstIcon");

/** Pager "Last page". */
export const PagerLastIcon = lucide(ChevronsRight, 2.5, "PagerLastIcon");

/** Pager "Next". */
export const PagerNextIcon = lucide(ChevronRight, 2.5, "PagerNextIcon");

/** The check inside a checked checkbox (stroke 3). */
export const CheckIcon = lucide(Check, 3, "CheckIcon");

/** Search box leading icon. */
export const SearchIcon = lucide(Search, 2, "SearchIcon");

/** Table "Filters" button. */
export const FilterIcon = lucide(ListFilter, 2, "FilterIcon");

/** Date fields. */
export const CalendarIcon = lucide(Calendar, 2, "CalendarIcon");

/** Close glyph inside chips (stroke 3). */
export const XIcon = lucide(X, 3, "XIcon");

/** Field error / hint alert. */
export const AlertCircleIcon = lucide(CircleAlert, 2, "AlertCircleIcon");

/** Password "show". */
export const EyeIcon = lucide(Eye, 2, "EyeIcon");

/** Password "hide". */
export const EyeOffIcon = lucide(EyeOff, 2, "EyeOffIcon");

/** Stepper decrease. */
export const MinusIcon = lucide(Minus, 2.5, "MinusIcon");

/** Stepper increase and "New …" buttons. */
export const PlusIcon = lucide(Plus, 2.5, "PlusIcon");

/** Valid-field check (stroke 2.5; the checkbox check is 3). */
export const CheckThinIcon = lucide(Check, 2.5, "CheckThinIcon");

/** Drop-zone upload. */
export const UploadIcon = lucide(Upload, 2, "UploadIcon");

/** Document / file glyph. */
export const DocIcon = lucide(File, 2, "DocIcon");

/** Avatar upload camera. */
export const CameraIcon = lucide(Camera, 2, "CameraIcon");

/** The solid map pin on the location map: filled, with a white outline so it stands out on the map. */
export const PinIcon = lucide(MapPin, 1.5, "PinIcon", { fill: "currentColor", stroke: "var(--color-white)" });

/** "Use my location". */
export const LocateIcon = lucide(LocateFixed, 2, "LocateIcon");

/** Address / landmark field. */
export const MapPinIcon = lucide(MapPin, 2, "MapPinIcon");

/** "Recent" rows and times. */
export const ClockIcon = lucide(Clock, 2, "ClockIcon");

/** Branch / organization rows. */
export const BuildingIcon = lucide(Building, 2, "BuildingIcon");

/** Toast "error". */
export const XCircleIcon = lucide(CircleX, 2, "XCircleIcon");

/** Toast "warning". */
export const WarnIcon = lucide(TriangleAlert, 2, "WarnIcon");

/** Toast "info". */
export const InfoIcon = lucide(Info, 2, "InfoIcon");

/** Toast "undo". */
export const UndoIcon = lucide(RotateCcw, 2, "UndoIcon");

/** Toast "export ready" / downloads. */
export const DownloadIcon = lucide(Download, 2, "DownloadIcon");

/** Empty state "offline". */
export const WifiOffIcon = lucide(WifiOff, 2, "WifiOffIcon");

/** Empty state "locked / no access". */
export const LockIcon = lucide(Lock, 2, "LockIcon");

/** Empty state "couldn't load". */
export const AlertIcon = lucide(CircleAlert, 2, "AlertIcon");

/** Image placeholder. */
export const ImageIcon = lucide(Image, 2, "ImageIcon");

/** Plus for primary actions (stroke 2). */
export const PlusThinIcon = lucide(Plus, 2, "PlusThinIcon");

/** Upload "pause". */
export const PauseIcon = lucide(Pause, 2.5, "PauseIcon");

/** Upload "resume". */
export const PlayIcon = lucide(Play, 2.5, "PlayIcon");

/** Notifications. */
export const BellIcon = lucide(Bell, 2, "BellIcon");

/** Cart. */
export const CartIcon = lucide(ShoppingCart, 2, "CartIcon");

/** "Top rated". */
export const StarIcon = lucide(Star, 2, "StarIcon");

/** "Instant". */
export const BoltIcon = lucide(Zap, 2, "BoltIcon");

/** "Scheduled". */
export const ScheduleIcon = lucide(CalendarClock, 2, "ScheduleIcon");

/** Dashboard. */
export const DashboardIcon = lucide(LayoutDashboard, 2, "DashboardIcon");

/** Payments. */
export const CardIcon = lucide(CreditCard, 2, "CardIcon");

/** Settings. */
export const SettingsIcon = lucide(Settings, 2, "SettingsIcon");

/** Top-bar menu toggle (phones). */
export const MenuIcon = lucide(Menu, 2, "MenuIcon");

/** Sidebar group arrow. */
export const ChevRightIcon = lucide(ChevronRight, 2, "ChevRightIcon");

/** Organization switcher chevron. */
export const ChevUpDownIcon = lucide(ChevronsUpDown, 2, "ChevUpDownIcon");

/** Profile. */
export const UserIcon = lucide(User, 2, "UserIcon");

/** Log out. */
export const LogoutIcon = lucide(LogOut, 2, "LogoutIcon");

/** Security notes. */
export const ShieldIcon = lucide(Shield, 2, "ShieldIcon");

/** Back / step through records. */
export const ArrowLeftIcon = lucide(ArrowLeft, 2, "ArrowLeftIcon");

/** Step up. */
export const ChevUpIcon = lucide(ChevronUp, 2, "ChevUpIcon");

/** Expand to the full page. */
export const MaximizeIcon = lucide(Maximize2, 2, "MaximizeIcon");

/** Back to the panel. */
export const MinimizeIcon = lucide(Minimize2, 2, "MinimizeIcon");

/** Theme: light. */
export const SunIcon = lucide(Sun, 2.5, "SunIcon");

/** Theme: dark. */
export const MoonIcon = lucide(Moon, 2, "MoonIcon");

/** Theme: system. */
export const MonitorIcon = lucide(Monitor, 2, "MonitorIcon");

/** Not an icon but the flag the phone input shows next to +251; drawn as before (Lucide has no flags). */
export function FlagEthiopia(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 14" aria-hidden="true" {...props}>
      <rect width="24" height="4.67" fill="#078930" />
      <rect y="4.67" width="24" height="4.66" fill="#FCDD09" />
      <rect y="9.33" width="24" height="4.67" fill="#DA121A" />
      <circle cx="12" cy="7" r="3.4" fill="#0F47AF" />
      <polygon points="12,4.6 12.5,5.9 13.9,5.9 12.8,6.7 13.2,8.0 12,7.2 10.8,8.0 11.2,6.7 10.1,5.9 11.5,5.9" fill="#FCDD09" />
      <circle cx="12" cy="7" r="0.6" fill="#0F47AF" />
    </svg>
  );
}
