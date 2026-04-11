"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setIsSuccess(false);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMessage(error.message);
    } else {
      setIsSuccess(true);
      setMessage("Check your email for the magic link!");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-5" style={{ background: '#fafaf9' }}>
      <div className="court-lines" />
      <div className="w-full max-w-[380px] relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4" role="img" aria-label="Basketball">
            🏀
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: '#1c1917' }}>
            Weekly Hoops
          </h1>
          <span
            className="inline-block mt-2 text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full"
            style={{ background: '#fef3c7', color: '#92400e', letterSpacing: '0.5px' }}
          >
            Game Day Tracker
          </span>
        </div>

        {/* Card */}
        <form
          onSubmit={handleLogin}
          className="rounded-3xl p-8"
          style={{
            background: 'white',
            border: '1px solid #e7e5e4',
            boxShadow: '0 4px 24px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          <p className="text-center mb-6" style={{ color: '#78716c', fontSize: '15px', lineHeight: 1.5 }}>
            Sign in with your email to check in for this week&apos;s game
          </p>

          <label
            htmlFor="email"
            className="block text-sm font-semibold mb-1.5"
            style={{ color: '#44403c' }}
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full rounded-xl px-4 py-3.5 text-base transition-all"
            style={{
              border: '2px solid #e7e5e4',
              background: '#fafaf9',
              color: '#1c1917',
              outline: 'none',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#f97316';
              e.target.style.background = 'white';
              e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e7e5e4';
              e.target.style.background = '#fafaf9';
              e.target.style.boxShadow = 'none';
            }}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3.5 rounded-xl py-3.5 font-bold text-base text-white transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
            style={{
              background: '#1c1917',
              border: 'none',
            }}
            onMouseOver={(e) => {
              if (!loading) (e.target as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }}
            onMouseOut={(e) => {
              (e.target as HTMLElement).style.boxShadow = 'none';
            }}
          >
            {loading ? "Sending..." : "Continue with Email →"}
          </button>

          {message && (
            <p
              className="mt-4 text-center text-sm font-medium"
              style={{ color: isSuccess ? '#16a34a' : '#dc2626' }}
            >
              {message}
            </p>
          )}
        </form>

        <p className="text-center text-xs mt-5" style={{ color: '#a8a29e' }}>
          You&apos;ll receive a magic link — no password needed
        </p>
      </div>
    </div>
  );
}
