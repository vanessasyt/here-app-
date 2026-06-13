"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { C } from "../../lib/constants";
import type { Screen } from "../../lib/types";
import { Icon } from "../ui/Icon";
import { Wordmark } from "../ui/Wordmark";

export function SignupScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [email,     setEmail]   = useState("");
  const [pass,      setPass]    = useState("");
  const [confirm,   setConfirm] = useState("");
  const [showPass,  setShowPass]= useState(false);
  const [error,     setError]   = useState("");
  const [loading,   setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  async function handle() {
    if (!email||!pass)          { setError("Please fill in all fields"); return; }
    if (pass!==confirm)         { setError("Passwords don't match"); return; }
    if (pass.length<6)          { setError("Password must be at least 6 characters"); return; }
    setLoading(true); setError("");
    (window as any).__hereAuthInProgress = true;
    try {
      await supabase.auth.signOut().catch(() => {});
      const { data, error:err } = await supabase.auth.signUp({ email, password:pass });
      (window as any).__hereAuthInProgress = false;
      if (err) { setError(err.message); setLoading(false); return; }
      setLoading(false);
      if (!data.session) { setConfirmed(true); return; }
      onNavigate("onboarding");
    } catch {
      (window as any).__hereAuthInProgress = false;
      setLoading(false);
      setError("Something went wrong. Please try again.");
    }
  }

  const inp = "w-full px-4 py-3.5 rounded-2xl text-sm outline-none";
  const inpStyle = { background:"rgba(245,240,232,0.08)", border:"1px solid rgba(245,240,232,0.15)", color:C.cream, fontFamily:"'Hanken Grotesk',sans-serif" };

  if (confirmed) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-8" style={{ background:C.ink }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5" style={{ background:"rgba(246,241,233,0.08)", color:C.accent }}>
          <Icon name="mail" size={30} />
        </div>
        <div className="text-[26px] text-center leading-snug mb-3" style={{ fontFamily:"'Hanken Grotesk',sans-serif",fontWeight:800,letterSpacing:"-0.03em", color:C.cream }}>
          Check your inbox
        </div>
        <div className="text-sm text-center leading-relaxed mb-8" style={{ color:"rgba(245,240,232,0.55)" }}>
          We sent a confirmation link to <strong style={{ color:C.cream }}>{email}</strong>. Open it to verify your account, then come back and sign in.
        </div>
        <button onClick={()=>onNavigate("login")}
          className="w-full py-4 rounded-2xl text-[15px] font-semibold text-white border-0 cursor-pointer"
          style={{ background:C.accent, fontFamily:"'Hanken Grotesk',sans-serif" }}>
          Go to sign in
        </button>
        <div className="mt-4 text-xs text-center leading-relaxed" style={{ color:"rgba(245,240,232,0.3)" }}>
          Didn&apos;t receive it? Check your spam folder or try signing up again.
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col" style={{ background: C.ink }}>
      <div className="flex-1 flex flex-col px-8 pt-14 pb-8">
        <div className="mb-8">
          <div className="text-[28px]" style={{ fontFamily:"'Hanken Grotesk',sans-serif",fontWeight:800,letterSpacing:"-0.03em", color:C.cream }}>Create account</div>
          <div className="text-sm mt-1.5" style={{ color:"rgba(245,240,232,0.45)" }}>Join here. and meet people around you</div>
        </div>
        <div className="space-y-3">
          <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="Email address" className={inp} style={inpStyle} />
          <div className="relative">
            <input value={pass} onChange={e=>setPass(e.target.value)}
              type={showPass ? "text" : "password"} placeholder="Password (min 6 chars)"
              className={inp} style={{ ...inpStyle, paddingRight:48 }} />
            <button onClick={()=>setShowPass(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 border-0 bg-transparent cursor-pointer text-xs font-medium"
              style={{ color:"rgba(245,240,232,0.45)", fontFamily:"'Hanken Grotesk',sans-serif" }}>
              {showPass ? "Hide" : "Show"}
            </button>
          </div>
          <div className="relative">
            <input value={confirm} onChange={e=>setConfirm(e.target.value)}
              type={showPass ? "text" : "password"} placeholder="Confirm password"
              className={inp} style={{ ...inpStyle, paddingRight:48 }}
              onKeyDown={e=>e.key==="Enter"&&handle()} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none" style={{ color:"rgba(245,240,232,0.5)", fontSize:13 }}>
            <input type="checkbox" checked={showPass} onChange={e=>setShowPass(e.target.checked)}
              className="w-4 h-4 rounded cursor-pointer accent-[#C4783A]" />
            Show password
          </label>
          {error && <div className="text-xs text-center" style={{ color:"#f87171" }}>{error}</div>}
          <button onClick={handle} disabled={loading} className="w-full py-4 rounded-2xl text-[15px] font-semibold text-white border-0 cursor-pointer transition-opacity" style={{ background:C.accent, opacity:loading?0.6:1, fontFamily:"'Hanken Grotesk',sans-serif" }}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </div>
        <div className="mt-6 text-sm text-center" style={{ color:"rgba(245,240,232,0.45)" }}>
          Already have an account?{" "}
          <button onClick={()=>onNavigate("login")} className="border-0 bg-transparent cursor-pointer font-semibold" style={{ color:C.accent, fontFamily:"'Hanken Grotesk',sans-serif" }}>Sign in</button>
        </div>
      </div>
    </div>
  );
}
