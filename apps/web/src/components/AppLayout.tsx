// src/components/AppLayout.tsx
import { NavLink, Outlet } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";

// Tabs: base + active styles (purple theme for both light & dark)
const tabBase =
  "px-3 py-2 text-sm rounded-md transition-colors text-neutral-800 dark:text-slate-200 hover:bg-purple-200 dark:hover:bg-purple-500/10";
const tabActive = "bg-gradient-to-r from-purple-300 via-indigo-300 to-violet-300 dark:from-purple-600/20 dark:via-indigo-600/20 dark:to-violet-600/20 text-black dark:text-white font-medium border border-purple-400 dark:border-purple-500/30";
const tabClass = ({ isActive }: { isActive: boolean }) =>
  `${tabBase} ${isActive ? tabActive : ""}`;

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-white dark:bg-[hsl(var(--bg))] text-neutral-900 dark:text-[hsl(var(--fg))] transition-colors">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-purple-300 dark:border-purple-500/20 bg-purple-200 dark:bg-purple-950/30 backdrop-blur">
        <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          {/* Brand */}
          <div className="text-lg md:text-xl font-semibold tracking-tight text-black dark:bg-gradient-to-r dark:from-purple-400 dark:to-indigo-400 dark:bg-clip-text dark:text-transparent">
            LaunchPad
          </div>

          {/* Tabs */}
          <nav className="flex items-center gap-1">
            <NavLink to="/dashboard" className={tabClass}>Dashboard</NavLink>
            <NavLink to="/onboarding" className={tabClass}>New Product</NavLink>
            <NavLink to="/settings" className={tabClass}>Settings</NavLink>
          </nav>

          {/* Right-side actions - now with theme toggle! */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {/* Add more: notifications, profile, etc */}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="px-4 md:px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}