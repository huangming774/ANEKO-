export type ProfileRole = 'admin' | 'member'
export type ProfileStatus = 'active' | 'inactive'
export type WorkCategory = 'illustration' | 'photography' | 'cosplay' | 'video' | 'craft'
export type WorkStatus = 'pending' | 'approved' | 'rejected'
export type EventType = 'screening' | 'cosplay' | 'exhibition' | 'lecture' | 'workshop' | 'competition'
export type EventStatus = 'upcoming' | 'ongoing' | 'ended'
export type PostCategory = '公告' | '活动' | '分享' | '通知'
export type PostStatus = 'draft' | 'published'
export type JoinApplicationStatus = 'pending' | 'approved' | 'rejected'
export type EventApplicationStatus = 'pending' | 'approved' | 'rejected'

export type Profile = {
  id: string
  email: string
  display_name: string
  avatar: string
  role: ProfileRole
  status: ProfileStatus
  created_at: string
  updated_at: string
}

export type Work = {
  id: string
  title: string
  description: string
  story: string
  image: string
  category: WorkCategory
  status: WorkStatus
  author_id: string | null
  likes: number
  comments: number
  width: number | null
  height: number | null
  created_at: string
  updated_at: string
  profiles?: Pick<Profile, 'display_name' | 'avatar' | 'email'> | null
}

export type EventItem = {
  id: string
  title: string
  description: string
  image: string
  start_date: string
  end_date: string
  start_time: string
  end_time: string
  location: string
  type: EventType
  status: EventStatus
  max_participants: number
  current_participants: number
  organizer: string
  tags: string[]
  created_by: string | null
  created_at: string
  updated_at: string
}

export type Post = {
  id: string
  title: string
  content: string
  image: string
  author_id: string | null
  category: PostCategory
  status: PostStatus
  pinned: boolean
  views: number
  published_at: string | null
  created_at: string
  updated_at: string
  profiles?: Pick<Profile, 'display_name' | 'avatar' | 'email'> | null
}

export type JoinApplication = {
  id: string
  name: string
  student_id: string
  grade: string
  major: string
  phone: string
  qq: string
  departments: string[]
  intro: string
  status: JoinApplicationStatus
  created_at: string
  updated_at: string
}

export type EventApplication = {
  id: string
  event_id: string
  name: string
  phone: string
  qq: string
  note: string
  status: EventApplicationStatus
  created_at: string
  updated_at: string
}

export type SiteSettings = {
  id: boolean
  club_name: string
  club_description: string
  logo_url: string
  contact_email: string
  contact_phone: string
  site_title: string
  site_description: string
  announcement_banner: boolean
  open_registration: boolean
  email_notification: boolean
  new_member_notification: boolean
  new_work_notification: boolean
  activity_reminder: boolean
  created_at: string
  updated_at: string
}

export type HeroSlide = {
  id: string
  title: string
  description: string
  image: string
  href: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}
