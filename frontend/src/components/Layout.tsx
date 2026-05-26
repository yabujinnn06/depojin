import { LogOut, Settings, Boxes } from "lucide-react";
import DepoJinLogo from "./DepoJinLogo";
import { motion } from "framer-motion";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { cn } from "../lib/cn";

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur bg-deep/95 text-white border-b border-deep/20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold tracking-tight">
            <DepoJinLogo size={40} />
            <span className="hidden sm:inline">Depojin</span>
          </Link>
          <nav className="flex-1 flex gap-1 text-sm ml-3">
            <NavItem to="/" icon={<Boxes size={14} />} label="Oturumlar" />
            {user?.rol === "admin" && (
              <NavItem to="/admin" icon={<Settings size={14} />} label="Admin" />
            )}
          </nav>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium leading-tight">{user?.ad}</div>
              <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">{user?.rol}</div>
            </div>
            <button
              onClick={() => { logout(); nav("/login"); }}
              className="p-2 rounded-lg hover:bg-white/10 transition"
              title="Cikis"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <motion.div
          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 min-w-0"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) => cn(
        "px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition",
        isActive ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10",
      )}
    >
      {icon}{label}
    </NavLink>
  );
}
