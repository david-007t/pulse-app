export interface Profile {
  id: string
  username: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  phone: string | null
  location: string | null
  created_at: string
  updated_at: string
}

export interface Friendship {
  id: string
  user_id: string
  friend_id: string
  status: 'pending' | 'accepted' | 'blocked'
  created_at: string
}

export interface FriendWithProfile extends Friendship {
  profile: Profile
  online?: boolean
  current_venue?: string | null
}
