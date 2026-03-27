'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types/database'

interface FriendData {
  id: string
  name: string
  username: string
  avatar_url: string | null
  status: string
  online: boolean
  friendship_status: 'accepted' | 'pending'
  friendship_id: string
  is_incoming: boolean
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return '+1' + digits
  if (digits.length === 11 && digits[0] === '1') return '+' + digits
  if (digits.length > 6) return '+' + digits
  return ''
}

export default function FriendsPage() {
  const { user } = useAuth()
  const supabase = createClient()

  const [friends, setFriends] = useState<FriendData[]>([])
  const [requests, setRequests] = useState<FriendData[]>([])
  const [loading, setLoading] = useState(true)
  const [showSheet, setShowSheet] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [searching, setSearching] = useState(false)
  const [sheetTab, setSheetTab] = useState<'main' | 'search' | 'contacts'>('main')
  const [syncLoading, setSyncLoading] = useState(false)
  const [contactMatches, setContactMatches] = useState<Profile[]>([])
  const [phoneInput, setPhoneInput] = useState('')
  const [phoneSearchResult, setPhoneSearchResult] = useState<Profile | null>(null)
  const [phoneSearching, setPhoneSearching] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')

  useEffect(() => {
    if (!user?.id) return

    async function fetchFriends() {
      setLoading(true)
      try {
        const { data: friendships } = await supabase
          .from('friendships')
          .select('*, profile:profiles!friend_id(*)')
          .eq('user_id', user!.id)
          .eq('status', 'accepted')

        const { data: reverseFriendships } = await supabase
          .from('friendships')
          .select('*, profile:profiles!user_id(*)')
          .eq('friend_id', user!.id)
          .eq('status', 'accepted')

        const allFriends: FriendData[] = []

        if (friendships) {
          for (const f of friendships) {
            const p = f.profile as unknown as Profile
            if (p) {
              allFriends.push({
                id: p.id,
                name: p.display_name || p.username,
                username: p.username,
                avatar_url: p.avatar_url,
                status: 'On Pulse',
                online: false,
                friendship_status: 'accepted',
                friendship_id: f.id,
                is_incoming: false,
              })
            }
          }
        }

        if (reverseFriendships) {
          for (const f of reverseFriendships) {
            const p = f.profile as unknown as Profile
            if (p) {
              allFriends.push({
                id: p.id,
                name: p.display_name || p.username,
                username: p.username,
                avatar_url: p.avatar_url,
                status: 'On Pulse',
                online: false,
                friendship_status: 'accepted',
                friendship_id: f.id,
                is_incoming: true,
              })
            }
          }
        }

        // Always update — even if empty (removes stale mock data)
        setFriends(allFriends)

        const { data: pendingRequests } = await supabase
          .from('friendships')
          .select('*, profile:profiles!user_id(*)')
          .eq('friend_id', user!.id)
          .eq('status', 'pending')

        const reqs: FriendData[] = (pendingRequests || []).map((f) => {
          const p = f.profile as unknown as Profile
          return {
            id: p.id,
            name: p.display_name || p.username,
            username: p.username,
            avatar_url: p.avatar_url,
            status: 'Wants to connect',
            online: false,
            friendship_status: 'pending' as const,
            friendship_id: f.id,
            is_incoming: true,
          }
        })
        // Always update — even if empty
        setRequests(reqs)
      } catch (e) {
        console.error('Failed to fetch friends:', e)
      } finally {
        setLoading(false)
      }
    }

    fetchFriends()
  }, [user?.id])

  async function acceptRequest(friendshipId: string) {
    try {
      await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId)
    } catch {}
    const accepted = requests.find((r) => r.friendship_id === friendshipId)
    setRequests((prev) => prev.filter((r) => r.friendship_id !== friendshipId))
    if (accepted) setFriends((prev) => [...prev, { ...accepted, friendship_status: 'accepted' }])
  }

  async function declineRequest(friendshipId: string) {
    setRequests((prev) => prev.filter((r) => r.friendship_id !== friendshipId))
    try {
      await supabase.from('friendships').delete().eq('id', friendshipId)
    } catch {}
  }

  async function searchUsers(query: string) {
    setSearchQuery(query)
    if (query.length < 2) { setSearchResults([]); return }
    setSearching(true)
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .neq('id', user?.id ?? '')
        .limit(10)
      setSearchResults(data || [])
    } catch { setSearchResults([]) }
    setSearching(false)
  }

  async function syncContacts() {
    setSyncLoading(true)
    setContactMatches([])
    setSyncMessage('')

    if ('contacts' in navigator && 'ContactsManager' in window) {
      try {
        const contacts = await (navigator as unknown as {
          contacts: { select: (props: string[], opts: { multiple: boolean }) => Promise<Array<{ name: string[]; tel: string[] }>> }
        }).contacts.select(['name', 'tel'], { multiple: true })

        const rawPhones = contacts.flatMap((c) => c.tel || [])
        const normalized = Array.from(new Set(rawPhones.map(normalizePhone).filter(Boolean)))

        if (normalized.length === 0) {
          setSyncMessage('No phone numbers found in selected contacts.')
          setSyncLoading(false)
          return
        }

        const { data } = await supabase
          .from('profiles')
          .select('*')
          .in('phone', normalized)
          .neq('id', user?.id ?? '')

        if (data && data.length > 0) {
          setContactMatches(data)
          setSheetTab('contacts')
        } else {
          setSyncMessage('None of your contacts are on Pulse yet.')
        }
      } catch {
        setSyncMessage('Contact access was cancelled.')
      }
    } else {
      // Not supported on this platform — go straight to phone search
      setSheetTab('contacts')
    }
    setSyncLoading(false)
  }

  async function searchByPhone() {
    if (!phoneInput.trim()) return
    setPhoneSearching(true)
    setPhoneSearchResult(null)
    try {
      const normalized = normalizePhone(phoneInput.trim())
      if (!normalized) { setPhoneSearching(false); return }
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', normalized)
        .neq('id', user?.id ?? '')
        .limit(1)
        .maybeSingle()
      setPhoneSearchResult(data)
    } catch { setPhoneSearchResult(null) }
    setPhoneSearching(false)
  }

  async function sendFriendRequest(profileId: string) {
    if (!user?.id) return
    try {
      await supabase.from('friendships').insert({ user_id: user.id, friend_id: profileId, status: 'pending' })
    } catch {}
    setSearchResults((prev) => prev.filter((p) => p.id !== profileId))
    setContactMatches((prev) => prev.filter((p) => p.id !== profileId))
    if (phoneSearchResult?.id === profileId) setPhoneSearchResult(null)
  }

  const onlineFriends = friends.filter((f) => f.online)

  return (
    <div className="flex flex-col h-full pt-12 pb-20 overflow-y-auto">
      {/* Header */}
      <div className="px-4 flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#F1F5F9]">Friends</h1>
          <p className="text-[#94A3B8] text-sm mt-1">
            {loading ? 'Loading...' : `${onlineFriends.length} online now`}
          </p>
        </div>
        <button
          onClick={() => { setSheetTab('main'); setShowSheet(true) }}
          className="w-9 h-9 rounded-full bg-[#7C3AED]/20 flex items-center justify-center active:scale-95 transition-transform"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* Friend requests */}
      {requests.length > 0 && (
        <div className="px-4 mb-6">
          <p className="text-[#94A3B8] text-xs font-semibold uppercase tracking-wider mb-3">Friend Requests</p>
          <div className="flex flex-col gap-2">
            {requests.map((req) => (
              <div key={req.friendship_id} className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
                  {req.avatar_url
                    ? <img src={req.avatar_url} alt={req.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    : <div className="w-full h-full bg-gradient-to-br from-[#7C3AED]/60 to-[#EC4899]/60" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#F1F5F9] text-sm font-semibold truncate">{req.name}</p>
                  <p className="text-[#94A3B8] text-xs">@{req.username}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => acceptRequest(req.friendship_id)} className="px-3 py-1.5 rounded-full bg-[#7C3AED] text-white text-xs font-semibold active:scale-95 transition-transform">Accept</button>
                  <button onClick={() => declineRequest(req.friendship_id)} className="px-3 py-1.5 rounded-full bg-[#1E1E2E] text-[#94A3B8] text-xs font-medium active:scale-95 transition-transform">Decline</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Online friends */}
      {onlineFriends.length > 0 && (
        <div className="px-4 mb-6">
          <p className="text-[#94A3B8] text-xs font-semibold uppercase tracking-wider mb-3">Online Now</p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {onlineFriends.map((f) => (
              <div key={f.id} className="flex flex-col items-center gap-1 shrink-0">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full overflow-hidden">
                    {f.avatar_url
                      ? <img src={f.avatar_url} alt={f.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      : <div className="w-full h-full bg-gradient-to-br from-[#7C3AED] to-[#EC4899]" />}
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#34D399] border-2 border-[#0A0A0F]" />
                </div>
                <span className="text-xs text-[#94A3B8] w-12 text-center truncate">{f.name.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All friends list */}
      <div className="px-4">
        <p className="text-[#94A3B8] text-xs font-semibold uppercase tracking-wider mb-3">All Friends</p>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 rounded-full border-2 border-[#7C3AED] border-t-transparent animate-spin" />
          </div>
        ) : friends.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-4">
            <div className="w-16 h-16 rounded-full bg-[#13131A] border border-[#1E1E2E] flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-[#F1F5F9] text-sm font-semibold mb-1">No friends yet</p>
              <p className="text-[#94A3B8] text-xs leading-relaxed">Tap + to find people you know</p>
            </div>
            <button
              onClick={() => { setSheetTab('main'); setShowSheet(true) }}
              className="px-6 py-2.5 rounded-full font-semibold text-sm text-white"
              style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)' }}
            >
              Find Friends
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {friends.map((friend) => (
              <div key={friend.id} className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-3 flex items-center gap-3 cursor-pointer active:opacity-80 transition-opacity">
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full overflow-hidden">
                    {friend.avatar_url
                      ? <img src={friend.avatar_url} alt={friend.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      : <div className="w-full h-full bg-gradient-to-br from-[#7C3AED]/60 to-[#EC4899]/60" />}
                  </div>
                  {friend.online && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#34D399] border-2 border-[#13131A]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#F1F5F9] text-sm font-semibold">{friend.name}</p>
                  <p className="text-[#94A3B8] text-xs truncate">{friend.status}</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Find Friends bottom sheet */}
      {showSheet && (
        <>
          <div className="anim-fade-in fixed inset-0 bg-black/60 z-50" onClick={() => setShowSheet(false)} />
          <div className="anim-slide-up fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#13131A] border-t border-[#1E1E2E] rounded-t-3xl z-50" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}>
            <div className="flex justify-center pt-3 pb-4">
              <div className="w-10 h-1 rounded-full bg-[#1E1E2E]" />
            </div>
            <div className="px-5">
              <h2 className="text-lg font-bold text-[#F1F5F9] mb-5">Find Friends</h2>

              {sheetTab === 'main' && (
                <div className="flex flex-col gap-3">
                  {/* Sync Contacts */}
                  <button
                    onClick={syncContacts}
                    disabled={syncLoading}
                    className="flex items-center gap-3 bg-[#0A0A0F] border border-[#1E1E2E] rounded-2xl p-4 w-full text-left active:opacity-80 transition-opacity disabled:opacity-60"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#7C3AED]/15 flex items-center justify-center shrink-0">
                      {syncLoading
                        ? <div className="w-5 h-5 rounded-full border-2 border-[#7C3AED] border-t-transparent animate-spin" />
                        : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.19 15a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                          </svg>
                      }
                    </div>
                    <div className="flex-1">
                      <p className="text-[#F1F5F9] text-sm font-semibold">Sync Contacts</p>
                      <p className="text-[#94A3B8] text-xs">{syncMessage || 'Find friends from your phone'}</p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                  </button>

                  {/* Search by Phone */}
                  <button
                    onClick={() => { setSheetTab('contacts'); setSyncMessage('') }}
                    className="flex items-center gap-3 bg-[#0A0A0F] border border-[#1E1E2E] rounded-2xl p-4 w-full text-left active:opacity-80 transition-opacity"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#EC4899]/15 flex items-center justify-center shrink-0">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EC4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-[#F1F5F9] text-sm font-semibold">Search by Phone</p>
                      <p className="text-[#94A3B8] text-xs">Find someone by their number</p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                  </button>

                  {/* Invite via Link */}
                  <button
                    onClick={() => { if (navigator.share) { navigator.share({ title: 'Join me on Pulse', text: "Check out Pulse!", url: window.location.origin }).catch(() => {}) } }}
                    className="flex items-center gap-3 bg-[#0A0A0F] border border-[#1E1E2E] rounded-2xl p-4 w-full text-left active:opacity-80 transition-opacity"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#EC4899]/15 flex items-center justify-center shrink-0">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EC4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-[#F1F5F9] text-sm font-semibold">Invite via Link</p>
                      <p className="text-[#94A3B8] text-xs">Share your invite link</p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                  </button>

                  {/* Search by Username */}
                  <button
                    onClick={() => setSheetTab('search')}
                    className="flex items-center gap-3 bg-[#0A0A0F] border border-[#1E1E2E] rounded-2xl p-4 w-full text-left active:opacity-80 transition-opacity"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#7C3AED]/15 flex items-center justify-center shrink-0">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-[#F1F5F9] text-sm font-semibold">Search by Username</p>
                      <p className="text-[#94A3B8] text-xs">Find someone you know</p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                  </button>
                </div>
              )}

              {sheetTab === 'search' && (
                <div>
                  <button onClick={() => setSheetTab('main')} className="flex items-center gap-1.5 text-[#94A3B8] text-sm mb-4 active:opacity-70">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                    Back
                  </button>
                  <div className="relative mb-4">
                    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => searchUsers(e.target.value)}
                      placeholder="Search by username..."
                      autoFocus
                      className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-2xl py-3 pl-10 pr-4 text-[#F1F5F9] text-sm placeholder:text-[#94A3B8]/40 focus:outline-none focus:border-[#7C3AED] transition-colors"
                    />
                  </div>
                  {searching && <p className="text-[#94A3B8] text-sm text-center py-4">Searching...</p>}
                  <div className="flex flex-col gap-2 max-h-[240px] overflow-y-auto">
                    {searchResults.map((profile) => (
                      <div key={profile.id} className="flex items-center gap-3 bg-[#0A0A0F] border border-[#1E1E2E] rounded-2xl p-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
                          {profile.avatar_url
                            ? <img src={profile.avatar_url} alt={profile.display_name ?? ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            : <div className="w-full h-full bg-gradient-to-br from-[#7C3AED]/60 to-[#EC4899]/60" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[#F1F5F9] text-sm font-semibold truncate">{profile.display_name}</p>
                          <p className="text-[#94A3B8] text-xs">@{profile.username}</p>
                        </div>
                        <button onClick={() => sendFriendRequest(profile.id)} className="px-3 py-1.5 rounded-full bg-[#7C3AED] text-white text-xs font-semibold active:scale-95 transition-transform">Add</button>
                      </div>
                    ))}
                  </div>
                  {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                    <p className="text-[#94A3B8] text-sm text-center py-4">No users found</p>
                  )}
                </div>
              )}

              {sheetTab === 'contacts' && (
                <div>
                  <button onClick={() => { setSheetTab('main'); setSyncMessage('') }} className="flex items-center gap-1.5 text-[#94A3B8] text-sm mb-4 active:opacity-70">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                    Back
                  </button>

                  {contactMatches.length > 0 && (
                    <div className="mb-5">
                      <p className="text-[#94A3B8] text-xs font-semibold uppercase tracking-wider mb-3">
                        {contactMatches.length} contact{contactMatches.length > 1 ? 's' : ''} on Pulse
                      </p>
                      <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto">
                        {contactMatches.map((profile) => (
                          <div key={profile.id} className="flex items-center gap-3 bg-[#0A0A0F] border border-[#1E1E2E] rounded-2xl p-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
                              {profile.avatar_url
                                ? <img src={profile.avatar_url} alt={profile.display_name ?? ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                : <div className="w-full h-full bg-gradient-to-br from-[#7C3AED]/60 to-[#EC4899]/60" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[#F1F5F9] text-sm font-semibold truncate">{profile.display_name}</p>
                              <p className="text-[#94A3B8] text-xs">@{profile.username}</p>
                            </div>
                            <button onClick={() => sendFriendRequest(profile.id)} className="px-3 py-1.5 rounded-full bg-[#7C3AED] text-white text-xs font-semibold active:scale-95 transition-transform">Add</button>
                          </div>
                        ))}
                      </div>
                      <div className="h-px bg-[#1E1E2E] my-4" />
                    </div>
                  )}

                  <p className="text-[#94A3B8] text-xs font-semibold uppercase tracking-wider mb-3">Find by Phone Number</p>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchByPhone()}
                      placeholder="+1 (555) 000-0000"
                      autoFocus
                      className="flex-1 bg-[#0A0A0F] border border-[#1E1E2E] rounded-2xl py-3 px-4 text-[#F1F5F9] text-sm placeholder:text-[#94A3B8]/40 focus:outline-none focus:border-[#7C3AED] transition-colors"
                    />
                    <button
                      onClick={searchByPhone}
                      disabled={phoneSearching || !phoneInput.trim()}
                      className="px-4 py-3 rounded-2xl bg-[#7C3AED] text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50"
                    >
                      {phoneSearching ? '...' : 'Find'}
                    </button>
                  </div>

                  {phoneSearchResult ? (
                    <div className="flex items-center gap-3 bg-[#0A0A0F] border border-[#1E1E2E] rounded-2xl p-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
                        {phoneSearchResult.avatar_url
                          ? <img src={phoneSearchResult.avatar_url} alt={phoneSearchResult.display_name ?? ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          : <div className="w-full h-full bg-gradient-to-br from-[#7C3AED]/60 to-[#EC4899]/60" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[#F1F5F9] text-sm font-semibold truncate">{phoneSearchResult.display_name}</p>
                        <p className="text-[#94A3B8] text-xs">@{phoneSearchResult.username}</p>
                      </div>
                      <button onClick={() => sendFriendRequest(phoneSearchResult.id)} className="px-3 py-1.5 rounded-full bg-[#7C3AED] text-white text-xs font-semibold active:scale-95 transition-transform">Add</button>
                    </div>
                  ) : phoneInput.length > 3 && !phoneSearching ? (
                    <p className="text-[#94A3B8] text-sm text-center py-2">No one found with that number</p>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
