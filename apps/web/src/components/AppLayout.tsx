// src/components/AppLayout.tsx
import { NavLink, Outlet } from "react-router-dom";

// Tabs: base + active styles (dark-first)
const tabBase =
  "px-3 py-2 text-sm rounded-md text-slate-200 hover:bg-white/10 transition-colors";
const tabActive = "bg-white/10 text-white font-medium";
const tabClass = ({ isActive }: { isActive: boolean }) =>
  `${tabBase} ${isActive ? tabActive : ""}`;

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-[hsl(var(--bg))] text-[hsl(var(--fg))]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/30 backdrop-blur">
        <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          {/* Brand */}
          <div className="text-lg md:text-xl font-semibold tracking-tight">LaunchPad</div>

          {/* Tabs */}
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={tabClass}>Home</NavLink>
            <NavLink to="/dashboard" className={tabClass}>Dashboard</NavLink>
            <NavLink to="/products/new" className={tabClass}>New Product</NavLink>
            <NavLink to="/settings" className={tabClass}>Settings</NavLink>
          </nav>

          {/* Right-side actions (placeholder) */}
          <div className="hidden md:flex items-center gap-2">
            {/* e.g., search/theme/avatar later */}
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
