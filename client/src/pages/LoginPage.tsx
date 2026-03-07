import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { User, Lock, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";

export function LoginPage() {
  const { login, isLoggingIn, loginError } = useAuth();
  const { settings } = useSettings();
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const companyName = settings?.companyName ?? "Other Animal Entertainment";
  const appTitle    = settings?.appTitle    ?? "OAE Marketing";
  const logoUrl     = settings?.logoUrl     ?? null;
  const errorMsg    = loginError ? ((loginError as any)?.message ?? "Invalid credentials") : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await login({ username, password });
      navigate("/");
    } catch {}
  }

  return (
    <div className="relative flex min-h-screen overflow-hidden" style={{ background: "#020509" }}>
      {/* Left panel */}
      <div className="relative hidden lg:flex lg:w-[54%] flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, #050f20 0%, #04091a 40%, #020509 100%)" }} />
        <div className="absolute -top-48 -left-48 h-[700px] w-[700px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(225,29,72,0.18) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-32 -right-32 h-[600px] w-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)" }} />
        <motion.div
          className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(225,29,72,0.06) 0%, transparent 65%)" }}
          animate={{ scale: [1, 1.18, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 opacity-[0.045]"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.7) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
          }} />

        <div className="relative z-10">
          {logoUrl ? (
            <img src={logoUrl} alt={appTitle} className="h-8 w-auto object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          ) : (
            <span className="text-[12px] font-semibold tracking-[0.14em] uppercase"
              style={{ color: "rgba(255,255,255,0.3)" }}>
              {appTitle}
            </span>
          )}
        </div>

        <motion.div
          className="relative z-10"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: "rgba(251,113,133,0.65)" }}>
            Film Marketing Command Center
          </p>
          <h2 className="text-[46px] font-bold leading-[1.05] tracking-tight text-white">
            Every title.<br />
            <span style={{
              background: "linear-gradient(95deg, #f43f5e 0%, #fb923c 45%, #e879f9 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              Every territory.
            </span>
          </h2>
          <p className="mt-6 max-w-sm text-[15px] leading-relaxed"
            style={{ color: "rgba(255,255,255,0.3)" }}>
            Territory-aware distribution links, AI-driven campaigns, and smart clip rotation for independent film.
          </p>
          <div className="mt-10 flex items-center gap-8">
            {[
              { label: "Clip", sub: "Library" },
              { label: "Smart", sub: "Links" },
              { label: "AI", sub: "Campaigns" },
            ].map(({ label, sub }) => (
              <div key={label}>
                <p className="text-[13px] font-semibold text-white/75">{label}</p>
                <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>{sub}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div className="relative z-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.16)" }}>
            {companyName} · {new Date().getFullYear()}
          </span>
        </motion.div>
      </div>

      {/* Right panel */}
      <div className="relative flex flex-1 items-center justify-center px-6 py-12">
        <div className="absolute inset-0 lg:hidden">
          <div className="absolute -top-40 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(225,29,72,0.15) 0%, transparent 65%)", filter: "blur(20px)" }} />
        </div>
        <div className="absolute left-0 top-8 bottom-8 w-px hidden lg:block"
          style={{ background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.07) 30%, rgba(255,255,255,0.07) 70%, transparent)" }} />

        <motion.div
          className="relative z-10 w-full max-w-[380px]"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="mb-8 lg:hidden">
            {logoUrl ? (
              <img src={logoUrl} alt={appTitle} className="h-8 w-auto object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <span className="text-[12px] font-semibold tracking-[0.14em] uppercase"
                style={{ color: "rgba(255,255,255,0.3)" }}>
                {appTitle}
              </span>
            )}
          </div>

          <div className="mb-8">
            <h1 className="text-[28px] font-bold tracking-tight text-white">Welcome back</h1>
            <p className="mt-1.5 text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
              {companyName} · Sign in to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em]"
                style={{ color: "rgba(255,255,255,0.38)" }}>
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                  style={{ color: "rgba(255,255,255,0.18)" }} />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                  autoFocus
                  autoComplete="username"
                  className="w-full rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/20 outline-none transition-all duration-200"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  onFocus={(e) => { e.target.style.border = "1px solid rgba(225,29,72,0.5)"; e.target.style.background = "rgba(255,255,255,0.07)"; }}
                  onBlur={(e)  => { e.target.style.border = "1px solid rgba(255,255,255,0.08)"; e.target.style.background = "rgba(255,255,255,0.04)"; }}
                />
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em]"
                style={{ color: "rgba(255,255,255,0.38)" }}>
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                  style={{ color: "rgba(255,255,255,0.18)" }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/20 outline-none transition-all duration-200"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  onFocus={(e) => { e.target.style.border = "1px solid rgba(225,29,72,0.5)"; e.target.style.background = "rgba(255,255,255,0.07)"; }}
                  onBlur={(e)  => { e.target.style.border = "1px solid rgba(255,255,255,0.08)"; e.target.style.background = "rgba(255,255,255,0.04)"; }}
                />
              </div>
            </motion.div>

            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-red-400 flex-shrink-0" />
                <p className="text-sm text-red-400">{errorMsg}</p>
              </motion.div>
            )}

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} className="pt-1">
              <motion.button
                type="submit"
                whileTap={{ scale: 0.98 }}
                disabled={isLoggingIn}
                className="group relative w-full overflow-hidden rounded-xl py-3 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg, #e11d48 0%, #be123c 60%, #9f1239 100%)",
                  boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 4px 24px rgba(225,29,72,0.35), inset 0 1px 0 rgba(255,255,255,0.1)",
                }}
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:translate-x-full transition-transform duration-500" />
                {isLoggingIn ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in…
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Sign in <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                )}
              </motion.button>
            </motion.div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
