"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  Award,
  Bot,
  CalendarCheck,
  CalendarClock,
  Dumbbell,
  Flame,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  MoreHorizontal,
  Salad,
  Settings,
  Sparkles,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/store/auth-context";
import { useData } from "@/lib/store/data-context";
import { ReminderScheduler } from "@/components/ReminderScheduler";
import { levelFromXP, levelTitle } from "@/lib/fitness";
import { Avatar, Pill, Progress, Skeleton } from "@/components/ui/feedback";
import { cn, dayKeyOf, formatDateLong, toISODate } from "@/lib/utils";
import { DAY_LABELS } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Train",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={17} /> },
      { href: "/plan", label: "Weekly Plan", icon: <CalendarCheck size={17} /> },
      { href: "/train", label: "Start Workout", icon: <Dumbbell size={17} /> },
      { href: "/exercises", label: "Exercise Library", icon: <Activity size={17} /> },
    ],
  },
  {
    group: "Track",
    items: [
      { href: "/attendance", label: "Attendance", icon: <Flame size={17} /> },
      { href: "/progress", label: "Progress", icon: <LineChart size={17} /> },
      { href: "/nutrition", label: "Nutrition", icon: <Salad size={17} /> },
      { href: "/achievements", label: "Achievements", icon: <Award size={17} /> },
    ],
  },
  {
    group: "Crew",
    items: [
      { href: "/team", label: "Team", icon: <Users size={17} /> },
      { href: "/coach", label: "AI Coach", icon: <Bot size={17} /> },
    ],
  },
  {
    group: "Setup",
    items: [
      { href: "/timetable", label: "Timetable & Alarms", icon: <CalendarClock size={17} /> },
      { href: "/tools", label: "Gym Tools", icon: <Wrench size={17} /> },
      { href: "/settings", label: "Settings", icon: <Settings size={17} /> },
    ],
  },
];

const MOBILE_PRIMARY: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: <LayoutDashboard size={19} /> },
  { href: "/plan", label: "Plan", icon: <CalendarCheck size={19} /> },
  { href: "/train", label: "Train", icon: <Dumbbell size={20} /> },
  { href: "/team", label: "Team", icon: <Users size={19} /> },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, signOut } = useAuth();
  const { data, loading } = useData();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!loading && data && !data.profile.onboarded && pathname !== "/onboarding") {
      router.replace("/onboarding");
    }
  }, [loading, data, pathname, router]);

  useEffect(() => {
    // Close the mobile menus whenever navigation lands somewhere new.
    /* eslint-disable react-hooks/set-state-in-effect */
    setMobileNavOpen(false);
    setMoreOpen(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [pathname]);

  if (authLoading || loading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 animate-pulse-ring items-center justify-center rounded-xl bg-volt text-volt-ink">
            <Dumbbell size={22} />
          </div>
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    );
  }

  const level = levelFromXP(data.gamification.xp);
  const todayKey = dayKeyOf();

  return (
    <div className="flex min-h-screen bg-bg">
      <ReminderScheduler />
      {/* -------------------------------------------------------- sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-bg2 transition-transform lg:translate-x-0",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-volt text-volt-ink">
              <Dumbbell size={18} />
            </span>
            <span className="font-display text-lg font-extrabold tracking-tight">
              Iron<span className="text-volt">Pulse</span>
            </span>
          </Link>
          <button
            type="button"
            className="rounded-md p-1 text-faint lg:hidden"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mx-3 mb-3 rounded-lg border border-line bg-panel p-3">
          <div className="flex items-center gap-2.5">
            <Avatar name={data.profile.displayName} src={data.profile.photoURL} size={38} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">
                {data.profile.displayName}
              </p>
              <p className="text-[11px] text-faint">
                Lv {level.level} · {levelTitle(level.level)}
              </p>
            </div>
          </div>
          <Progress value={level.pct} className="mt-2.5" height={4} />
          <p className="mt-1 text-[10px] text-faint tnum">
            {level.into} / {level.need} XP to level {level.level + 1}
          </p>
        </div>

        <nav className="scroll-thin flex-1 overflow-y-auto px-3 pb-4">
          {NAV.map((section) => (
            <div key={section.group} className="mb-4">
              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-faint">
                {section.group}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition",
                          active
                            ? "bg-volt/12 font-medium text-volt"
                            : "text-muted hover:bg-panel2 hover:text-ink",
                        )}
                      >
                        <span className={active ? "text-volt" : "text-faint"}>{item.icon}</span>
                        {item.label}
                        {item.href === "/train" && (
                          <span className="ml-auto text-[10px] text-faint">
                            {DAY_LABELS[todayKey].slice(0, 3)}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-line p-3">
          <button
            type="button"
            onClick={() => signOut()}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted transition hover:bg-panel2 hover:text-danger"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden
        />
      )}

      {/* ----------------------------------------------------------- main */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur-md">
          <button
            type="button"
            className="rounded-md p-1.5 text-muted transition hover:bg-panel2 hover:text-ink lg:hidden"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-faint">{formatDateLong(toISODate())}</p>
          </div>

          <Link
            href="/attendance"
            className="flex items-center gap-1.5 rounded-full border border-line bg-panel px-2.5 py-1 transition hover:border-ember/50"
            title="Current streak"
          >
            <Flame size={14} className={data.streak.current > 0 ? "text-ember" : "text-faint"} />
            <span className="text-xs font-semibold tnum">{data.streak.current}</span>
          </Link>

          <Link
            href="/coach"
            className="hidden items-center gap-1.5 rounded-full border border-line bg-panel px-2.5 py-1 text-xs text-muted transition hover:border-volt/50 hover:text-volt sm:flex"
          >
            <Sparkles size={13} />
            Ask coach
          </Link>

          <Link href="/settings">
            <Avatar name={data.profile.displayName} src={data.profile.photoURL} size={30} />
          </Link>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-5 lg:pb-10">
          {children}
        </main>
      </div>

      {/* --------------------------------------------------- mobile nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg2/95 backdrop-blur-md lg:hidden">
        <ul className="flex items-stretch">
          {MOBILE_PRIMARY.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const isTrain = item.href === "/train";
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-0.5 py-2.5 text-[10px] transition",
                    active ? "text-volt" : "text-faint",
                  )}
                >
                  <span
                    className={cn(
                      isTrain &&
                        "-mt-5 flex h-11 w-11 items-center justify-center rounded-full bg-volt text-volt-ink shadow-[0_8px_24px_-8px_var(--c-volt)]",
                    )}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className={cn(
                "flex w-full flex-col items-center gap-0.5 py-2.5 text-[10px]",
                moreOpen ? "text-volt" : "text-faint",
              )}
            >
              <MoreHorizontal size={19} />
              More
            </button>
          </li>
        </ul>

        {moreOpen && (
          <div className="grid grid-cols-3 gap-2 border-t border-line bg-bg2 p-3">
            {NAV.flatMap((s) => s.items)
              .filter((i) => !MOBILE_PRIMARY.some((m) => m.href === i.href))
              .map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center gap-1.5 rounded-lg border border-line bg-panel p-3 text-[10px] text-muted"
                >
                  <span className="text-volt">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
          </div>
        )}
      </nav>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
  badge,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">{title}</h1>
          {badge && <Pill tone="volt">{badge}</Pill>}
        </div>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
