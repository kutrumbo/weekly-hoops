"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function Nav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const links = [
    { href: "/", label: "This Week" },
    { href: "/history", label: "History" },
    { href: "/settings", label: "Settings" },
    ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <nav
      className="sticky top-0 z-50"
      style={{ background: "white", borderBottom: "1px solid #e7e5e4" }}
    >
      <div className="max-w-[600px] mx-auto px-5">
        <div className="flex items-center justify-between h-14">
          <Link
            href="/"
            className="font-extrabold text-lg flex items-center gap-2"
            style={{ color: "#1c1917" }}
          >
            <span>🏀</span> Weekly Hoops
          </Link>

          {/* Desktop nav links */}
          <div className="hidden sm:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors"
                style={
                  pathname === link.href
                    ? { background: "#fef3c7", color: "#92400e" }
                    : { color: "#78716c" }
                }
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={handleSignOut}
              className="ml-1 px-3 py-1.5 rounded-lg text-[13px] transition-colors"
              style={{ color: "#a8a29e" }}
            >
              Sign Out
            </button>
          </div>

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="sm:hidden flex flex-col justify-center items-center w-10 h-10 rounded-lg"
            aria-label="Toggle menu"
          >
            <span
              className="block w-5 h-0.5 rounded-full transition-all duration-200"
              style={{
                background: "#1c1917",
                transform: menuOpen ? "rotate(45deg) translateY(3px)" : "none",
              }}
            />
            <span
              className="block w-5 h-0.5 rounded-full mt-1 transition-all duration-200"
              style={{
                background: "#1c1917",
                opacity: menuOpen ? 0 : 1,
              }}
            />
            <span
              className="block w-5 h-0.5 rounded-full mt-1 transition-all duration-200"
              style={{
                background: "#1c1917",
                transform: menuOpen ? "rotate(-45deg) translateY(-3px)" : "none",
              }}
            />
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div
          className="sm:hidden px-5 pb-4"
          style={{ borderTop: "1px solid #f5f5f4" }}
        >
          <div className="flex flex-col gap-1 pt-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={
                  pathname === link.href
                    ? { background: "#fef3c7", color: "#92400e" }
                    : { color: "#44403c" }
                }
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={() => {
                setMenuOpen(false);
                handleSignOut();
              }}
              className="px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition-colors"
              style={{ color: "#a8a29e" }}
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
