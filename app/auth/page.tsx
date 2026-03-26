'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthPage() {
  const [showComingSoon, setShowComingSoon] = useState(false)
  const supabase = createClient()

  async function signInWithGoogle() {
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
    } catch {
      // Placeholder credentials — OAuth won't work yet
    }
  }

  function handleEmailClick() {
    setShowComingSoon(true)
    setTimeout(() => setShowComingSoon(false), 2500)
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-dvh overflow-hidden px-6">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-[#0A0A0F]">
        {/* Glow blob 1 - purple */}
        <div
          className="blob-float-1 absolute w-[340px] h-[340px] rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, #7C3AED 0%, transparent 70%)',
            top: '15%',
            left: '-10%',
          }}
        />
        {/* Glow blob 2 - pink */}
        <div
          className="blob-float-2 absolute w-[280px] h-[280px] rounded-full opacity-25"
          style={{
            background: 'radial-gradient(circle, #EC4899 0%, transparent 70%)',
            bottom: '20%',
            right: '-5%',
          }}
        />
        {/* Glow blob 3 - mixed */}
        <div
          className="blob-float-3 absolute w-[200px] h-[200px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, #7C3AED 0%, #EC4899 50%, transparent 70%)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-[340px]">
        {/* Logo */}
        <div className="mb-3">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect width="48" height="48" rx="14" fill="url(#logoGrad)" />
            <path
              d="M24 14C20.134 14 17 17.134 17 21c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"
              fill="white"
            />
            <defs>
              <linearGradient id="logoGrad" x1="0" y1="0" x2="48" y2="48">
                <stop stopColor="#7C3AED" />
                <stop offset="1" stopColor="#EC4899" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <h1
          className="text-4xl font-bold tracking-tight mb-2"
          style={{
            background: 'linear-gradient(135deg, #F1F5F9 0%, #CBD5E1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Pulse
        </h1>
        <p className="text-[#94A3B8] text-base text-center mb-12 leading-relaxed">
          Discover what&apos;s happening<br />around you
        </p>

        {/* Google sign-in button */}
        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 bg-white text-[#1F2937] font-semibold text-[15px] rounded-full py-3.5 px-6 shadow-lg shadow-black/20 active:scale-[0.98] transition-transform"
        >
          {/* Google "G" SVG */}
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-4 w-full my-6">
          <div className="flex-1 h-px bg-[#1E1E2E]" />
          <span className="text-[#94A3B8] text-xs uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-[#1E1E2E]" />
        </div>

        {/* Email option */}
        <button
          onClick={handleEmailClick}
          className="w-full flex items-center justify-center gap-3 bg-[#13131A] border border-[#1E1E2E] text-[#F1F5F9] font-medium text-[15px] rounded-full py-3.5 px-6 active:scale-[0.98] transition-transform"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94A3B8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M22 7l-10 7L2 7" />
          </svg>
          Continue with Email
        </button>

        {/* Coming soon toast */}
        <div
          className="mt-4 px-4 py-2 rounded-full bg-[#13131A] border border-[#1E1E2E] transition-all duration-300"
          style={{
            opacity: showComingSoon ? 1 : 0,
            transform: showComingSoon ? 'translateY(0)' : 'translateY(8px)',
            pointerEvents: 'none',
          }}
        >
          <span className="text-[#94A3B8] text-sm">Email sign-in coming soon</span>
        </div>

        {/* Terms */}
        <p className="text-[#94A3B8]/60 text-[11px] text-center mt-8 leading-relaxed">
          By continuing you agree to our{' '}
          <span className="text-[#94A3B8]/80 underline underline-offset-2">Terms of Service</span>
          {' '}&{' '}
          <span className="text-[#94A3B8]/80 underline underline-offset-2">Privacy Policy</span>
        </p>
      </div>

    </div>
  )
}
