"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  Bot,
  LayoutDashboard,
  MessageSquare,
  Smartphone,
  LogOut,
  Zap,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/bots", icon: Bot, label: "My Bots" },
  { href: "/dashboard/connect", icon: Smartphone, label: "Connect WhatsApp" },
  { href: "/dashboard/logs", icon: MessageSquare, label: "Message Logs" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <aside className="flex flex-col w-60 shrink-0 bg-[#1a1d27] border-r border-[#2a2f45] h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[#2a2f45]">
        <div className="w-8 h-8 rounded-lg bg-[#6c63ff] flex items-center justify-center">
          <Zap size={16} className="text-white" />
        </div>
        <span className="font-semibold text-[#e8eaf0] text-base tracking-tight">
          BotFlow
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 p-3 flex-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                active
                  ? "bg-[#6c63ff]/10 text-[#6c63ff]"
                  : "text-[#6b7280] hover:text-[#e8eaf0] hover:bg-[#22263a]"
              )}
            >
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="p-3 border-t border-[#2a2f45]">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#22263a] mb-1">
          <div className="w-7 h-7 rounded-full bg-[#6c63ff] flex items-center justify-center text-xs font-bold text-white shrink-0">
            {user?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-[#e8eaf0] truncate">
              {user?.name ?? "User"}
            </span>
            <span className="text-[10px] text-[#6b7280] truncate">
              {user?.email ?? ""}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-[#6b7280] hover:text-[#ef4444] hover:bg-[#ef4444]/5 transition-all duration-150"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
