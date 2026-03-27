'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { createClient } from '@/lib/supabase/client'

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return '+1' + digits
  if (digits.length === 11 && digits[0] === '1') return '+' + digits
  if (digits.length > 6) return '+' + digits
  return ''
}

const MOCK_PROFILE = {
  display_name: 'Alex Rivera',
  username: 'alex_rivera',
  bio: 'Night owl. Music lover. Always exploring.',
  avatar_url: null as string | null,
  location: 'San Francisco, CA',
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading, setProfile } = useProfile(user?.id)
  const supabase = createClient()

  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editUsername, setEditUsername] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [friendCount, setFriendCount] = useState<number>(0)

  const loading = authLoading || profileLoading

  // Derive display data — use profile if available, fallback to user metadata only
  const displayName = profile?.display_name || user?.user_metadata?.full_name || ''
  const username = profile?.username || user?.email?.split('@')[0] || ''
  const bio = profile?.bio || ''
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || null
  const userLocation = profile?.location || ''

  // Fetch friend count
  useEffect(() => {
    if (!user?.id) return
    async function fetchCount() {
      try {
        const { count } = await supabase
          .from('friendships')
          .select('id', { count: 'exact', head: true })
          .or(`user_id.eq.${user!.id},friend_id.eq.${user!.id}`)
          .eq('status', 'accepted')
        setFriendCount(count ?? 0)
      } catch {
        // Placeholder credentials
      }
    }
    fetchCount()
  }, [user?.id])

  function startEditing() {
    setEditName(displayName)
    setEditUsername(username)
    setEditBio(bio || '')
    setEditPhone(profile?.phone || '')
    setEditLocation(userLocation || '')
    setUsernameAvailable(null)
    setSaveError(null)
    setEditing(true)
  }

  function handleUsernameChange(value: string) {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9_]/g, '')
    setEditUsername(cleaned)
    setUsernameAvailable(null)
    if (cleaned.length < 3) return
    if (cleaned === username) { setUsernameAvailable(true); return }
    supabase
      .from('profiles')
      .select('id')
      .eq('username', cleaned)
      .maybeSingle()
      .then(({ data }) => setUsernameAvailable(data === null))
  }

  async function saveEdits() {
    if (!user) return
    if (editUsername.length < 3) { setSaveError('Username must be at least 3 characters.'); return }
    if (usernameAvailable === false) { setSaveError('Username is already taken.'); return }
    setSaving(true)
    setSaveError(null)
    const normalizedPhone = editPhone.trim() ? normalizePhone(editPhone.trim()) : null
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        username: editUsername,
        display_name: editName,
        bio: editBio || null,
        phone: normalizedPhone,
        location: editLocation || null,
        avatar_url: avatarUrl,
      })
      .select()
      .single()
    setSaving(false)
    if (error) {
      setSaveError('Could not save. Please try again.')
      return
    }
    if (data) setProfile(data)
    setEditing(false)
  }

  async function signOut() {
    try {
      await supabase.auth.signOut()
    } catch {
      // Placeholder credentials
    }
    router.push('/auth')
  }

  const stats = [
    { label: 'Friends', value: friendCount.toString() },
    { label: 'Events', value: '0' },
    { label: 'Photos', value: '0' },
  ]

  // Loading skeleton
  if (loading) {
    return (
      <div className="flex flex-col h-full pt-12">
        <div className="px-4 flex items-center justify-between mb-6">
          <div className="h-8 w-24 bg-[#13131A] rounded-lg animate-pulse" />
          <div className="w-9 h-9 rounded-full bg-[#13131A] animate-pulse" />
        </div>
        <div className="flex flex-col items-center px-4 mb-6">
          <div className="w-20 h-20 rounded-full bg-[#13131A] animate-pulse mb-3" />
          <div className="h-5 w-32 bg-[#13131A] rounded-lg animate-pulse mb-2" />
          <div className="h-4 w-48 bg-[#13131A] rounded-lg animate-pulse" />
        </div>
        <div className="mx-4 h-20 bg-[#13131A] rounded-2xl animate-pulse mb-6" />
        <div className="px-4 space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-14 bg-[#13131A] rounded-2xl animate-pulse"
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full pt-12 pb-20 overflow-y-auto">
      {/* Header */}
      <div className="px-4 flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#F1F5F9]">Profile</h1>
        <button className="w-9 h-9 rounded-full bg-[#13131A] border border-[#1E1E2E] flex items-center justify-center">
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
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* Avatar + name */}
      <div className="flex flex-col items-center px-4 mb-6">
        <div className="relative mb-3">
          <div className="absolute inset-[-3px] rounded-full" style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }} />
          <div className="relative w-20 h-20 rounded-full overflow-hidden border-[2px] border-[#0A0A0F]">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#7C3AED] to-[#EC4899]" />
            )}
          </div>
        </div>

        {editing ? (
          <div className="w-full max-w-[280px] space-y-3 mb-2">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full bg-[#13131A] border border-[#1E1E2E] rounded-xl py-2 px-3 text-[#F1F5F9] text-sm text-center focus:outline-none focus:border-[#7C3AED]"
              placeholder="Display name"
            />
            <div className="relative">
              <input
                value={editUsername}
                onChange={(e) => handleUsernameChange(e.target.value)}
                className={`w-full bg-[#13131A] border rounded-xl py-2 px-3 text-[#F1F5F9] text-sm text-center focus:outline-none transition-colors ${
                  usernameAvailable === false
                    ? 'border-red-500'
                    : usernameAvailable === true
                    ? 'border-[#34D399]'
                    : 'border-[#1E1E2E] focus:border-[#7C3AED]'
                }`}
                placeholder="username"
              />
              {usernameAvailable === true && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#34D399] text-xs">✓</span>
              )}
              {usernameAvailable === false && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 text-xs">taken</span>
              )}
            </div>
            <textarea
              value={editBio}
              onChange={(e) => setEditBio(e.target.value.slice(0, 150))}
              className="w-full bg-[#13131A] border border-[#1E1E2E] rounded-xl py-2 px-3 text-[#F1F5F9] text-sm text-center focus:outline-none focus:border-[#7C3AED] resize-none"
              placeholder="Bio"
              rows={2}
            />
            <input
              type="tel"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              className="w-full bg-[#13131A] border border-[#1E1E2E] rounded-xl py-2 px-3 text-[#F1F5F9] text-sm text-center focus:outline-none focus:border-[#7C3AED]"
              placeholder="+1 (555) 000-0000"
            />
            <input
              value={editLocation}
              onChange={(e) => setEditLocation(e.target.value)}
              className="w-full bg-[#13131A] border border-[#1E1E2E] rounded-xl py-2 px-3 text-[#F1F5F9] text-sm text-center focus:outline-none focus:border-[#7C3AED]"
              placeholder="Location"
            />
            {saveError && (
              <p className="text-red-400 text-xs text-center">{saveError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 py-2 rounded-full border border-[#1E1E2E] text-[#94A3B8] text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={saveEdits}
                disabled={saving || usernameAvailable === false}
                className="flex-1 py-2 rounded-full bg-[#7C3AED] text-white text-sm font-semibold disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-[#F1F5F9] font-bold text-lg">{displayName}</h2>
            <p className="text-[#94A3B8] text-sm">
              @{username}
              {userLocation ? ` \u00B7 ${userLocation}` : ''}
            </p>
            {bio && (
              <p className="text-[#94A3B8] text-sm text-center mt-1.5 px-6 leading-relaxed">
                {bio}
              </p>
            )}
            <button
              onClick={startEditing}
              className="mt-3 px-6 py-1.5 rounded-full border border-[#7C3AED] text-[#7C3AED] text-sm font-medium active:opacity-80 transition-opacity"
            >
              Edit Profile
            </button>
          </>
        )}
      </div>

      {/* Stats */}
      <div className="mx-4 bg-[#13131A] border border-[#1E1E2E] rounded-2xl flex divide-x divide-[#1E1E2E] mb-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex-1 flex flex-col items-center py-4"
          >
            <span className="text-[#F1F5F9] font-bold text-lg">
              {stat.value}
            </span>
            <span className="text-[#94A3B8] text-xs mt-0.5">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Settings list */}
      <div className="px-4 flex flex-col gap-2">
        {[
          {
            label: 'Notifications',
            icon: (
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
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            ),
          },
          {
            label: 'Privacy',
            icon: (
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
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            ),
          },
          {
            label: 'Help & Support',
            icon: (
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
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            ),
          },
        ].map((item) => (
          <button
            key={item.label}
            className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl px-4 py-3.5 flex items-center gap-3 w-full text-left active:opacity-80 transition-opacity"
          >
            {item.icon}
            <span className="text-[#F1F5F9] text-sm font-medium flex-1">
              {item.label}
            </span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#94A3B8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ))}
      </div>

      {/* Sign out */}
      <div className="px-4 mt-4">
        <button
          onClick={signOut}
          className="w-full py-3.5 rounded-2xl border border-[#EC4899]/30 text-[#EC4899] text-sm font-medium active:opacity-80 transition-opacity"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
