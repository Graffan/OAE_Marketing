import { Switch, Route, Link, useLocation } from "wouter";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { LoginPage } from "@/pages/LoginPage";
import TitlesPage from "@/pages/TitlesPage";
import TitleDetailPage from "@/pages/TitleDetailPage";
import ProjectsPage from "@/pages/ProjectsPage";
import ProjectDetailPage from "@/pages/ProjectDetailPage";
import AdminPage from "@/pages/AdminPage";
import ClipLibraryPage from "@/pages/ClipLibraryPage";
import DestinationsPage from "@/pages/DestinationsPage";
import SmartLinksPage from "@/pages/SmartLinksPage";
import DashboardPage from "@/pages/DashboardPage";
import CampaignsPage from "@/pages/CampaignsPage";
import CampaignDetailPage from "@/pages/CampaignDetailPage";
import AiStudioPage from "@/pages/AiStudioPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import SchedulePage from "@/pages/SchedulePage";
import CalendarPage from "@/pages/CalendarPage";
import MorganPage from "@/pages/MorganPage";
import MorganStatusPage from "@/pages/MorganStatusPage";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Film,
  Video,
  Megaphone,
  Globe,
  Link2,
  Sparkles,
  BarChart3,
  CalendarDays,
  Send,
  BrainCircuit,
  Activity,
  Settings,
  LogOut,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

// ─── Role constants ────────────────────────────────────────────────────────────
const ADMIN_ONLY         = ["admin"];
const OPERATOR_AND_ABOVE = ["admin", "marketing_operator"];
const REVIEWER_AND_ABOVE = ["admin", "marketing_operator", "reviewer"];
const NOT_FREELANCER     = ["admin", "marketing_operator", "reviewer", "executive"];
const NOT_EXECUTIVE      = ["admin", "marketing_operator", "reviewer", "freelancer"];

// ─── Theme toggle ──────────────────────────────────────────────────────────────
function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === "system" ? "light" : theme === "light" ? "dark" : "system";
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  return (
    <button
      onClick={() => setTheme(next)}
      className="flex items-center justify-center h-8 w-8 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.08] transition-all"
      title={`Theme: ${theme}`}
    >
      <Icon className="h-[15px] w-[15px]" />
    </button>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar() {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const [location] = useLocation();

  const role        = user?.role ?? "";
  const companyName = settings?.companyName ?? "Other Animal";
  const appTitle    = settings?.appTitle    ?? "OAE Marketing";
  const logoUrl     = settings?.logoUrl;
  const initials    = (user?.username?.[0] ?? "?").toUpperCase();

  const navItems = [
    { href: "/",             label: "Dashboard",    icon: LayoutDashboard, roles: null },
    { href: "/titles",       label: "Titles",       icon: Film,            roles: NOT_FREELANCER },
    { href: "/clips",        label: "Clip Library", icon: Video,           roles: NOT_EXECUTIVE },
    { href: "/campaigns",    label: "Campaigns",    icon: Megaphone,       roles: REVIEWER_AND_ABOVE },
    { href: "/destinations", label: "Destinations", icon: Globe,           roles: OPERATOR_AND_ABOVE },
    { href: "/smart-links",  label: "Smart Links",  icon: Link2,           roles: OPERATOR_AND_ABOVE },
    { href: "/ai-studio",    label: "AI Studio",    icon: Sparkles,        roles: OPERATOR_AND_ABOVE },
    { href: "/schedule",     label: "Schedule",     icon: Send,            roles: OPERATOR_AND_ABOVE },
    { href: "/calendar",     label: "Calendar",     icon: CalendarDays,    roles: null },
    { href: "/morgan",       label: "Morgan",       icon: BrainCircuit,    roles: null },
    { href: "/morgan/status", label: "Morgan Ops",   icon: Activity,        roles: OPERATOR_AND_ABOVE },
    { href: "/analytics",    label: "Analytics",    icon: BarChart3,       roles: null },
    { href: "/admin",        label: "Admin",        icon: Settings,        roles: ADMIN_ONLY },
  ].filter(({ roles }) => !roles || roles.includes(role));

  return (
    <aside className="w-[220px] flex-shrink-0 flex flex-col bg-[#060d1b] text-white border-r border-white/[0.06]">
      {/* Brand */}
      <div className="px-4 pt-5 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt={companyName} className="h-8 w-auto object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          ) : (
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-rose-600 to-rose-800 flex items-center justify-center flex-shrink-0 shadow-[0_4px_12px_rgba(225,29,72,0.4)]">
              <span className="text-[10px] font-bold tracking-tight text-white">OAE</span>
            </div>
          )}
          <div className="min-w-0">
            <div className="font-semibold text-[14px] text-white leading-tight truncate tracking-[-0.01em]">{appTitle}</div>
            <div className="text-[11px] text-white/35 truncate mt-0.5">{companyName}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/25">
          Navigation
        </div>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? location === "/" : location.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors duration-150",
                active ? "text-white" : "text-white/50 hover:text-white/85"
              )}
            >
              {active && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-xl bg-rose-600/90 shadow-[0_2px_8px_rgba(225,29,72,0.4)]"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              {!active && (
                <span className="absolute inset-0 rounded-xl hover:bg-white/[0.06] transition-colors" />
              )}
              <Icon className={cn("relative z-10 h-[15px] w-[15px] flex-shrink-0", active ? "text-white" : "text-white/40")} />
              <span className="relative z-10">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 pt-3 border-t border-white/[0.06] space-y-3">
        <div className="flex items-center gap-2.5 px-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-rose-500/30 to-rose-700/30 border border-rose-500/30 ring-2 ring-rose-500/20 text-rose-300 font-semibold text-xs flex items-center justify-center flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-white/80 truncate leading-tight">
              {user?.username}
            </div>
            <div className="text-[11px] text-white/30 capitalize">{role.replace("_", " ")}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <NotificationBell />
          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 flex-1 px-2.5 py-1.5 text-[12px] text-white/30 hover:text-white/65 rounded-lg hover:bg-white/[0.06] transition-all"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}

// ─── Layout ────────────────────────────────────────────────────────────────────
function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto min-h-0">{children}</main>
    </div>
  );
}

// ─── Auth guard ────────────────────────────────────────────────────────────────
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  useSettings();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#060d1b]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500/20 border-t-rose-500" />
          <p className="text-xs text-white/30 tracking-wider uppercase">Loading</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <LoginPage />;
  return <Layout>{children}</Layout>;
}

// ─── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route>
        <AuthGuard>
          <Switch>
            <Route path="/"             component={DashboardPage} />
            <Route path="/titles" component={TitlesPage} />
            <Route path="/titles/:id" component={TitleDetailPage} />
            <Route path="/projects" component={ProjectsPage} />
            <Route path="/projects/:id" component={ProjectDetailPage} />
            <Route path="/clips"        component={ClipLibraryPage} />
            <Route path="/campaigns"    component={CampaignsPage} />
            <Route path="/campaigns/:id" component={CampaignDetailPage} />
            <Route path="/destinations" component={DestinationsPage} />
            <Route path="/smart-links"  component={SmartLinksPage} />
            <Route path="/ai-studio"    component={AiStudioPage} />
            <Route path="/schedule"     component={SchedulePage} />
            <Route path="/calendar"     component={CalendarPage} />
            <Route path="/morgan/status" component={MorganStatusPage} />
            <Route path="/morgan"       component={MorganPage} />
            <Route path="/analytics"    component={AnalyticsPage} />
            <Route path="/admin"        component={AdminPage} />
            <Route>
              <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                  <h1 className="text-2xl font-bold mb-2">404</h1>
                  <Link href="/" className="text-sm text-muted-foreground hover:underline">Back to Dashboard</Link>
                </div>
              </div>
            </Route>
          </Switch>
        </AuthGuard>
      </Route>
    </Switch>
  );
}
