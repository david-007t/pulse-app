'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

const TOTAL_STEPS = 4

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return '+1' + digits
  if (digits.length === 11 && digits[0] === '1') return '+' + digits
  if (digits.length > 6) return '+' + digits
  return ''
}

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [animating, setAnimating] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  // Form state
  const [username, setUsername] = useState('')
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [bio, setBio] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      // If profile already exists, skip onboarding
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()
      if (existing) {
        router.replace('/')
        return
      }
      setUser(user)
      if (user.user_metadata?.full_name) {
        const name = user.user_metadata.full_name.toLowerCase().replace(/\s+/g, '_')
        setUsername(name)
      }
    })
  }, [])

  function goTo(nextStep: number) {
    if (animating) return
    setDirection(nextStep > step ? 'forward' : 'back')
    setAnimating(true)
    setTimeout(() => {
      setStep(nextStep)
      setAnimating(false)
    }, 280)
  }

  function handleUsernameChange(value: string) {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9_]/g, '')
    setUsername(cleaned)
    setUsernameAvailable(null)
    if (cleaned.length < 3) return
    // Real availability check against DB
    supabase
      .from('profiles')
      .select('id')
      .eq('username', cleaned)
      .maybeSingle()
      .then(({ data }) => {
        setUsernameAvailable(data === null)
      })
  }

  async function saveProfile() {
    if (!user) return
    setSaving(true)
    setSaveError(null)
    const normalizedPhone = phone.trim() ? normalizePhone(phone.trim()) : null
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      username: username || user.user_metadata?.full_name?.toLowerCase().replace(/\s+/g, '_') || 'user',
      display_name: user.user_metadata?.full_name || 'User',
      avatar_url: user.user_metadata?.avatar_url || null,
      bio: bio || null,
      location: location || null,
      ...(normalizedPhone ? { phone: normalizedPhone } : {}),
    })
    setSaving(false)
    if (error) {
      setSaveError('Could not save profile. Please try again.')
      return
    }
    goTo(4)
  }

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there'
  const avatarUrl = user?.user_metadata?.avatar_url
  const suggestions = user?.user_metadata?.full_name
    ? [
        user.user_metadata.full_name.toLowerCase().replace(/\s+/g, '_'),
        `${user.user_metadata.full_name.split(' ')[0].toLowerCase()}_pulse`,
        `${user.user_metadata.full_name.split(' ')[0].toLowerCase()}${Math.floor(Math.random() * 99)}`,
      ]
    : ['pulse_user', 'new_explorer', 'night_owl']

  const slideClass = animating
    ? direction === 'forward'
      ? 'translate-x-[-100%] opacity-0'
      : 'translate-x-[100%] opacity-0'
    : 'translate-x-0 opacity-100'

  return (
    <div className="relative flex flex-col min-h-dvh overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-[#0A0A0F]">
        <div
          className="blob-float-1 absolute w-[300px] h-[300px] rounded-full opacity-25"
          style={{
            background: 'radial-gradient(circle, #7C3AED 0%, transparent 70%)',
            top: '10%',
            left: '-8%',
          }}
        />
        <div
          className="blob-float-2 absolute w-[240px] h-[240px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, #EC4899 0%, transparent 70%)',
            bottom: '15%',
            right: '-5%',
          }}
        />
      </div>

      {/* Header bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-14 pb-4">
        {step > 1 && step < 4 ? (
          <button
            onClick={() => goTo(step - 1)}
            className="w-9 h-9 rounded-full bg-[#13131A] border border-[#1E1E2E] flex items-center justify-center active:scale-95 transition-transform"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#F1F5F9"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        ) : (
          <div className="w-9" />
        )}
        {step < 4 && (
          <span className="text-[#94A3B8] text-sm font-medium">
            {step} of {TOTAL_STEPS - 1}
          </span>
        )}
        <div className="w-9" />
      </div>

      {/* Progress dots */}
      {step < 4 && (
        <div className="relative z-10 flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: s === step ? 24 : 8,
                backgroundColor: s <= step ? '#7C3AED' : '#1E1E2E',
              }}
            />
          ))}
        </div>
      )}

      {/* Step content */}
      <div className="relative z-10 flex-1 flex flex-col px-6">
        <div
          className={`flex-1 flex flex-col transition-all duration-300 ease-out ${slideClass}`}
        >
          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="flex-1 flex flex-col items-center justify-center -mt-12">
              {/* Avatar with glowing ring */}
              <div className="relative mb-6">
                <div
                  className="ring-pulse absolute inset-[-4px] rounded-full"
                  style={{
                    background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
                  }}
                />
                <div className="relative w-24 h-24 rounded-full overflow-hidden border-[3px] border-[#0A0A0F]">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#7C3AED] to-[#EC4899]" />
                  )}
                </div>
              </div>

              <h1 className="text-[28px] font-bold text-[#F1F5F9] mb-2">
                Welcome, {firstName}!
              </h1>
              <p className="text-[#94A3B8] text-base text-center leading-relaxed mb-10">
                Let&apos;s set up your Pulse profile
              </p>

              <button
                onClick={() => goTo(2)}
                className="w-full py-3.5 rounded-full font-semibold text-[15px] text-white active:scale-[0.98] transition-transform"
                style={{
                  background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
                }}
              >
                Get Started
              </button>
            </div>
          )}

          {/* Step 2: Username */}
          {step === 2 && (
            <div className="flex-1 flex flex-col pt-4">
              <h2 className="text-2xl font-bold text-[#F1F5F9] mb-2">
                Pick a username
              </h2>
              <p className="text-[#94A3B8] text-sm mb-8">
                This is how others will find you on Pulse
              </p>

              {/* Username input */}
              <div className="relative mb-4">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8] text-base font-medium">
                  @
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="username"
                  maxLength={24}
                  className="w-full bg-[#13131A] border border-[#1E1E2E] rounded-2xl py-3.5 pl-9 pr-12 text-[#F1F5F9] text-base placeholder:text-[#94A3B8]/40 focus:outline-none focus:border-[#7C3AED] transition-colors"
                />
                {/* Availability indicator */}
                {usernameAvailable !== null && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {usernameAvailable ? (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#34D399"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#F87171"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    )}
                  </div>
                )}
              </div>

              {usernameAvailable && (
                <p className="text-[#34D399] text-xs mb-6 ml-1">Available</p>
              )}

              {/* Suggestions */}
              <p className="text-[#94A3B8] text-xs uppercase tracking-wider font-semibold mb-3">
                Suggestions
              </p>
              <div className="flex flex-wrap gap-2 mb-auto">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleUsernameChange(s)}
                    className="px-4 py-2 rounded-full bg-[#13131A] border border-[#1E1E2E] text-[#94A3B8] text-sm active:border-[#7C3AED] active:text-[#F1F5F9] transition-colors"
                  >
                    @{s}
                  </button>
                ))}
              </div>

              <button
                onClick={() => goTo(3)}
                disabled={!username || username.length < 3}
                className="w-full py-3.5 rounded-full font-semibold text-[15px] text-white mb-8 active:scale-[0.98] transition-all disabled:opacity-40"
                style={{
                  background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
                }}
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 3: About you */}
          {step === 3 && (
            <div className="flex-1 flex flex-col pt-4">
              <h2 className="text-2xl font-bold text-[#F1F5F9] mb-2">
                About you
              </h2>
              <p className="text-[#94A3B8] text-sm mb-8">
                Optional — you can always add this later
              </p>

              {/* Bio */}
              <label className="text-[#94A3B8] text-xs uppercase tracking-wider font-semibold mb-2">
                Bio
              </label>
              <div className="relative mb-6">
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 150))}
                  placeholder="Tell people a little about yourself..."
                  rows={3}
                  className="w-full bg-[#13131A] border border-[#1E1E2E] rounded-2xl py-3 px-4 text-[#F1F5F9] text-sm placeholder:text-[#94A3B8]/40 focus:outline-none focus:border-[#7C3AED] transition-colors resize-none"
                />
                <span className="absolute bottom-3 right-4 text-[#94A3B8]/50 text-xs">
                  {bio.length}/150
                </span>
              </div>

              {/* Phone */}
              <label className="text-[#94A3B8] text-xs uppercase tracking-wider font-semibold mb-2">
                Phone (Optional)
              </label>
              <div className="relative mb-6">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-[#13131A] border border-[#1E1E2E] rounded-2xl py-3.5 px-4 text-[#F1F5F9] text-sm placeholder:text-[#94A3B8]/40 focus:outline-none focus:border-[#7C3AED] transition-colors"
                />
              </div>

              {/* Location */}
              <label className="text-[#94A3B8] text-xs uppercase tracking-wider font-semibold mb-2">
                Location
              </label>
              <div className="relative mb-auto">
                <svg
                  className="absolute left-4 top-1/2 -translate-y-1/2"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#94A3B8"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City, State"
                  className="w-full bg-[#13131A] border border-[#1E1E2E] rounded-2xl py-3.5 pl-11 pr-4 text-[#F1F5F9] text-sm placeholder:text-[#94A3B8]/40 focus:outline-none focus:border-[#7C3AED] transition-colors"
                />
              </div>

              <div className="flex items-center gap-3 mb-8">
                <button
                  onClick={() => {
                    setBio('')
                    setPhone('')
                    setLocation('')
                    saveProfile()
                  }}
                  className="flex-1 py-3.5 rounded-full font-medium text-[15px] text-[#94A3B8] bg-[#13131A] border border-[#1E1E2E] active:scale-[0.98] transition-transform"
                >
                  Skip
                </button>
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="flex-[2] py-3.5 rounded-full font-semibold text-[15px] text-white active:scale-[0.98] transition-all disabled:opacity-60"
                  style={{
                    background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
                  }}
                >
                  {saving ? 'Saving...' : 'Continue'}
                </button>
              </div>
              {saveError && (
                <p className="text-red-400 text-sm text-center mt-3">{saveError}</p>
              )}
            </div>
          )}

          {/* Step 4: All set! */}
          {step === 4 && (
            <div className="flex-1 flex flex-col items-center justify-center -mt-8">
              {/* Celebration animation */}
              <div className="relative mb-8">
                {/* Expanding rings */}
                <div className="celeb-ring-1 absolute inset-[-20px] rounded-full border-2 border-[#7C3AED]/30" />
                <div className="celeb-ring-2 absolute inset-[-40px] rounded-full border border-[#EC4899]/20" />
                <div className="celeb-ring-3 absolute inset-[-60px] rounded-full border border-[#7C3AED]/10" />

                {/* Confetti dots */}
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                      background: i % 2 === 0 ? '#7C3AED' : '#EC4899',
                      top: '50%',
                      left: '50%',
                      animation: `confettiDot 2s ease-out infinite ${i * 0.15}s`,
                      transform: `rotate(${i * 45}deg) translateY(-50px)`,
                      opacity: 0,
                    }}
                  />
                ))}

                {/* Avatar */}
                <div className="relative w-24 h-24 rounded-full overflow-hidden border-[3px] border-[#7C3AED]">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#7C3AED] to-[#EC4899]" />
                  )}
                </div>
              </div>

              <h1 className="text-[28px] font-bold text-[#F1F5F9] mb-2">
                You&apos;re on Pulse!
              </h1>

              {/* Profile card */}
              <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-4 flex items-center gap-3 w-full max-w-[280px] mb-10">
                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#7C3AED] to-[#EC4899]" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[#F1F5F9] text-sm font-semibold truncate">
                    {user?.user_metadata?.full_name || 'User'}
                  </p>
                  <p className="text-[#94A3B8] text-xs truncate">@{username}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={() => router.push('/friends')}
                  className="flex-1 py-3.5 rounded-full font-semibold text-[15px] text-white active:scale-[0.98] transition-transform"
                  style={{
                    background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
                  }}
                >
                  Find Friends
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="flex-1 py-3.5 rounded-full font-medium text-[15px] text-[#F1F5F9] bg-[#13131A] border border-[#1E1E2E] active:scale-[0.98] transition-transform"
                >
                  Explore
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
