import type { LucideProps } from "lucide-react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Filter,
  Heart,
  HeartPulse,
  HelpCircle,
  Info,
  LayoutDashboard,
  LineChart,
  Lock,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Share2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Trash2,
  TrendingDown,
  TrendingUp,
  User,
  UserCheck,
  UserRound,
  Users,
  X,
  XCircle,
} from "lucide-react";

/**
 * Standard icon map binding semantic names to Lucide icons.
 */
export const ICON_MAP = {
  // Navigation & Core Roles
  dashboard: LayoutDashboard,
  profile: UserRound,
  user: UserRound,
  users: Users,
  patient: User,
  hcp: Stethoscope,
  admin: Shield,
  settings: Settings,
  logout: LogOut,
  menu: Menu,

  // Clinical & Health
  ecg: HeartPulse,
  pulse: HeartPulse,
  health: HeartPulse,
  heart: Heart,
  symptom: Activity,
  stethoscope: Stethoscope,
  disease: BookOpen,
  catalog: BookOpen,
  assessment: FileCheck,
  chart: LineChart,
  trend: LineChart,
  "trend-up": TrendingUp,
  "trend-down": TrendingDown,

  // Communication & Appointments
  calendar: CalendarDays,
  clock: Clock,
  chat: MessageCircle,
  message: MessageSquare,
  mail: Mail,
  bell: Bell,

  // Actions & Directions
  search: Search,
  filter: Filter,
  plus: Plus,
  close: X,
  cross: X,
  check: Check,
  "check-circle": CheckCircle2,
  "x-circle": XCircle,
  "arrow-right": ArrowRight,
  "arrow-left": ArrowLeft,
  "arrow-up": ArrowUp,
  "arrow-down": ArrowDown,
  "chevron-right": ChevronRight,
  "chevron-left": ChevronLeft,
  "chevron-down": ChevronDown,
  "chevron-up": ChevronUp,

  // Admin & System
  "user-check": UserCheck,
  "book-open": BookOpen,
  "git-pull-request": RefreshCw,
  database: BookOpen,
  "message-square": MessageSquare,
  "alert-circle": AlertCircle,
  "alert-triangle": AlertTriangle,
  "hospital": Shield,
  "badge-check": ShieldCheck,
  activity: Activity,

  // Security & Legal
  verified: ShieldCheck,
  shield: Shield,
  "shield-check": ShieldCheck,
  "shield-alert": ShieldAlert,
  lock: Lock,
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  help: HelpCircle,

  // Files & Export
  "file-text": FileText,
  download: Download,
  share: Share2,
  external: ExternalLink,
  refresh: RefreshCw,
  trash: Trash2,
  more: MoreHorizontal,
  "more-vertical": MoreVertical,
  eye: Eye,
} as const;

export type IconName = keyof typeof ICON_MAP;

interface IconProps extends LucideProps {
  name: IconName;
  className?: string;
  size?: number | string;
  strokeWidth?: number;
}

export function Icon({
  name,
  className = "w-5 h-5",
  size,
  strokeWidth = 2,
  ...props
}: IconProps) {
  const Component = ICON_MAP[name] ?? HelpCircle;

  return (
    <Component
      className={className}
      size={size}
      strokeWidth={strokeWidth}
      aria-hidden={props["aria-label"] ? undefined : true}
      {...props}
    />
  );
}

// Re-export Lucide icons directly for convenient inline use
export {
  LayoutDashboard,
  UserRound,
  BookOpen,
  HeartPulse,
  CalendarDays,
  MessageCircle,
  ShieldCheck,
  Search,
  Bell,
  Settings,
  LogOut,
  Stethoscope,
  Activity,
  Info,
  Check,
  X,
  Plus,
  Clock,
  LineChart,
};
