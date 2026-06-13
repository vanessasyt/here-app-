"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { C } from "../../lib/constants";
import type { Screen, UserProfile } from "../../lib/types";
import { Wordmark } from "../ui/Wordmark";

export function LoginScreen({ onNavigate, onLogin }: { onNavigate: (s: Screen) => void; onLogin: (u: UserProfile) => void }) {
  const [email, setEmail]       = useState("");
  const [password, setPass]     = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Password recovery mode — entered when user clicks a reset link
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [newPass, setNewPass]   = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [savingPass, setSavingPass] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSetNewPassword() {
    if (!newPass || !confirmPass) { setError("Please fill in both fields"); return; }
    if (newPass !== confirmPass)  { setError("Passwords don't match"); return; }
    if (newPass.length < 6)       { setError("Password must be at least 6 characters"); return; }
    setSavingPass(true); setError("");
    const { error: err } = await supabase.auth.updateUser({ password: newPass });
    setSavingPass(false);
    if (err) { setError(err.message); return; }
    setRecoveryMode(false);
    setError("");
    setPass("");
    // After setting a new password the session is active — log them straight in
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (profile) { onLogin(profile as UserProfile); return; }
    }
  }

  async function handle() {
    if (!email || !password) { setError("Please fill in all fields"); return; }
    setLoading(true); setError("");
    (window as any).__hereAuthInProgress = true;
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) {
        setError(err.message === "Invalid login credentials"
          ? "Incorrect email or password. Please try again."
          : err.message);
        setLoading(false);
        (window as any).__hereAuthInProgress = false;
        return;
      }
      const { data: profile, error: profileErr } = await supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
      setLoading(false);
      (window as any).__hereAuthInProgress = false;
      if (profileErr) { setError("Signed in but could not load your profile. Please try again."); return; }
      if (!profile) onNavigate("onboarding"); else onLogin(profile as UserProfile);
    } catch {
      setLoading(false);
      (window as any).__hereAuthInProgress = false;
      setError("Something went wrong. Please try again.");
    }
  }

  async function handleForgotPassword() {
    if (!email) { setError("Enter your email address above first"); return; }
    setResetLoading(true); setError("");
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setResetLoading(false);
    if (err) { setError(err.message); return; }
    setResetSent(true);
  }

  const inp = "w-full px-4 py-3.5 rounded-2xl text-sm outline-none";
  const inpStyle = { background:"rgba(245,240,232,0.08)", border:"1px solid rgba(245,240,232,0.15)", color:C.cream, fontFamily:"'Hanken Grotesk',sans-serif" };

  if (recoveryMode) {
    return (
      <div className="flex-1 flex flex-col" style={{ background: C.ink }}>
        <div className="flex-1 flex flex-col items-center justify-center px-8 pb-8">
          <div className="mb-2"><Wordmark size={42} /></div>
          <div className="text-sm mb-10" style={{ color:"rgba(245,240,232,0.45)" }}>Set a new password</div>
          <div className="w-full space-y-3">
            <input value={newPass} onChange={e=>setNewPass(e.target.value)}
              type={showPass ? "text" : "password"} placeholder="New password (min 6 chars)"
              className={inp} style={inpStyle} autoFocus />
            <input value={confirmPass} onChange={e=>setConfirmPass(e.target.value)}
              type={showPass ? "text" : "password"} placeholder="Confirm new password"
              className={inp} style={inpStyle}
              onKeyDown={e=>e.key==="Enter"&&handleSetNewPassword()} />
            <label className="flex items-center gap-2 cursor-pointer select-none" style={{ color:"rgba(245,240,232,0.5)", fontSize:13 }}>
              <input type="checkbox" checked={showPass} onChange={e=>setShowPass(e.target.checked)}
                className="w-4 h-4 rounded cursor-pointer accent-[#C4783A]" />
              Show password
            </label>
            {error && <div className="text-xs text-center" style={{ color:"#f87171" }}>{error}</div>}
            <button onClick={handleSetNewPassword} disabled={savingPass}
              className="w-full py-4 rounded-2xl text-[15px] font-semibold text-white border-0 cursor-pointer transition-opacity"
              style={{ background:C.accent, opacity:savingPass?0.6:1, fontFamily:"'Hanken Grotesk',sans-serif" }}>
              {savingPass ? "Saving…" : "Set new password"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col" style={{ background: C.ink }}>
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-8">
        <div className="mb-2"><Wordmark size={42} /></div>
        <div className="text-sm mb-10" style={{ color:"rgba(245,240,232,0.45)" }}>Meet in the moment</div>
        <div className="w-full space-y-3">
          <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="Email address" className={inp} style={inpStyle} />
          <div className="relative">
            <input value={password} onChange={e=>setPass(e.target.value)}
              type={showPass ? "text" : "password"} placeholder="Password"
              className={inp} style={{ ...inpStyle, paddingRight:48 }}
              onKeyDown={e=>e.key==="Enter"&&handle()} />
            <button onClick={()=>setShowPass(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 border-0 bg-transparent cursor-pointer text-xs font-medium"
              style={{ color:"rgba(245,240,232,0.45)", fontFamily:"'Hanken Grotesk',sans-serif" }}>
              {showPass ? "Hide" : "Show"}
            </button>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none" style={{ color:"rgba(245,240,232,0.5)", fontSize:13 }}>
            <input type="checkbox" checked={showPass} onChange={e=>setShowPass(e.target.checked)}
              className="w-4 h-4 rounded cursor-pointer accent-[#C4783A]" />
            Show password
          </label>
          {error && <div className="text-xs text-center" style={{ color:"#f87171" }}>{error}</div>}
          {resetSent && (
            <div className="text-xs text-center leading-relaxed p-3 rounded-xl" style={{ background:"rgba(74,124,89,0.15)", color:"rgba(232,245,238,0.8)" }}>
              Password reset email sent. Check your inbox and follow the link to set a new password.
            </div>
          )}
          <button onClick={handle} disabled={loading} className="w-full py-4 rounded-2xl text-[15px] font-semibold text-white border-0 cursor-pointer transition-opacity" style={{ background:C.accent, opacity:loading?0.6:1, fontFamily:"'Hanken Grotesk',sans-serif" }}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
          <button onClick={handleForgotPassword} disabled={resetLoading} className="w-full text-center text-sm border-0 bg-transparent cursor-pointer py-1" style={{ color:"rgba(245,240,232,0.4)", fontFamily:"'Hanken Grotesk',sans-serif" }}>
            {resetLoading ? "Sending…" : "Forgot password?"}
          </button>
        </div>
        <div className="mt-4 text-sm" style={{ color:"rgba(245,240,232,0.45)" }}>
          New here?{" "}
          <button onClick={()=>onNavigate("signup")} className="border-0 bg-transparent cursor-pointer font-semibold" style={{ color:C.accent, fontFamily:"'Hanken Grotesk',sans-serif" }}>Create account</button>
        </div>
      </div>
    </div>
  );
}
