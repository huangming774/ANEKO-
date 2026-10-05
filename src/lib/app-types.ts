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
  redis_enabled: boolean
  // 以下通知开关为 DB 保留列（UI/API 已不消费，预留未来通知功能），GET 仍会返回
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

export type VideoSourceType = 'upload' | 'bilibili'

export type Video = {
  id: string
  title: string
  description: string
  cover: string
  source_type: VideoSourceType
  source_url: string
  r2_key: string
  bilibili_bvid: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// AI 问答模型（API 响应不含 api_key 明文，只有 has_api_key 标志）
export type AiModel = {
  id: string
  name: string
  description: string
  api_base_url: string
  model_id: string
  sort_order: number
  is_active: boolean
  has_api_key: boolean
  created_at: string
  updated_at: string
}

// 公开的模型列表投影（不含 api_base_url / api_key）
export type AiModelPublic = Pick<AiModel, 'id' | 'name' | 'description' | 'model_id' | 'sort_order'>

// AI 全局设置：预置系统提示词（所有模型共用同一套回答口径）
export type AiSettings = {
  system_prompt: string
}

// 签到活动（限时定位打卡）
export type CheckinActivity = {
  id: string
  title: string
  note: string
  starts_at: string
  ends_at: string
  is_active: boolean
  checkin_count: number
  created_at: string
  updated_at: string
}

// 前台可见的当前活动投影（不含管理字段）
export type CheckinActivityPublic = {
  id: string
  title: string
  note: string
  starts_at: string
  ends_at: string
  checked_in_count: number
  server_time: string
}

// 签到记录（管理端视图）
export type CheckinRecord = {
  id: string
  cn: string
  latitude: number
  longitude: number
  accuracy: number | null
  created_at: string
}

// 签到提交载荷（匿名）
export type CheckinSubmitPayload = {
  cn: string
  latitude: number
  longitude: number
  accuracy?: number | null
}

export type AiChatMessage = {
  question: string
  answer: string
  modelName: string
  error?: string
}
