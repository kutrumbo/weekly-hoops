"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function Nav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

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
          <div className="flex items-center gap-1">
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
        </div>
      </div>
    </nav>
  );
}
