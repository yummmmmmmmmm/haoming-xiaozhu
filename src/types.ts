// ============================================================
// 好命小猪 · 领域模型定义
// 数据当前存本机（IndexedDB），字段设计已按"可直接换成云端接口"预留
// ============================================================

/** 本机账号 */
export interface User {
  id: string
  username: string
  /** 本机简单哈希，仅用于本地校验，非真实加密 */
  password: string
  nickname: string
  avatar: string
  signature: string
  createdAt: number
}

/** 荷兰猪档案 */
export interface Pet {
  id: string
  userId: string
  name: string
  avatar: string
  breed: string
  gender: '公' | '母' | '未知'
  /** YYYY-MM-DD */
  birthday: string
  color: string
  note: string
  createdAt: number
}

/** 体重记录（单位：克） */
export interface WeightRecord {
  id: string
  userId: string
  petId: string
  date: string
  weight: number
  note: string
  createdAt: number
}

/** 生宝宝记录类型：配种 / 怀孕 / 生产 */
export type BirthType = 'mating' | 'pregnant' | 'birth'

export interface BirthRecord {
  id: string
  userId: string
  petId: string
  date: string
  type: BirthType
  partner: string
  babies: number
  note: string
  createdAt: number
}

/** 相册照片 */
export interface Photo {
  id: string
  userId: string
  petId: string
  dataUrl: string
  caption: string
  date: string
  createdAt: number
}

/** 论坛帖子（userId 为空表示内置示例帖） */
export interface Post {
  id: string
  userId: string | null
  authorName: string
  authorAvatar: string
  content: string
  images: string[]
  topic: string
  /** 引用的已购商品 id：评论区的用户能看到并跳转到商城详情 */
  productId?: string
  likes: number
  liked: boolean
  createdAt: number
}

/** 论坛回复（replyToId 为空表示直接回复帖子本身） */
export interface Comment {
  id: string
  postId: string
  userId: string | null
  authorName: string
  authorAvatar: string
  content: string
  /** 回复里引用的已购商品 id：其他用户可见并可跳转商城 */
  productId?: string
  replyToId: string | null
  replyToName: string
  createdAt: number
}

/** 健康打卡类型：疫苗 / 驱虫 / 就医 / 洗澡 / 其他 */
export type HealthKind = 'vaccine' | 'deworm' | 'vet' | 'bath' | 'other'

/** 健康打卡记录 */
export interface HealthRecord {
  id: string
  userId: string
  petId: string
  date: string
  kind: HealthKind
  title: string
  note: string
  createdAt: number
}

/** 饲养日记（带心情和配图） */
export interface DiaryRecord {
  id: string
  userId: string
  petId: string
  date: string
  mood: string
  content: string
  images: string[]
  /** 来源说明，例如"饲养指南 · 干草怎么选""论坛摘录" */
  source?: string
  createdAt: number
}

/** 待办提醒（喂食、换垫料、洗澡等周期事项） */
export interface TodoRecord {
  id: string
  userId: string
  petId: string
  title: string
  /** 下次要做的日期 YYYY-MM-DD */
  dueDate: string
  /** 每隔几天重复一次，0 表示不重复 */
  cycleDays: number
  done: boolean
  note: string
  createdAt: number
}

/** 商品 */
export interface Product {
  id: string
  name: string
  category: string
  price: number
  originalPrice?: number
  image: string
  desc: string
  specs: string[]
  sales: number
  stock: number
  isNew: boolean
}

/** 购物车条目 */
export interface CartItem {
  id: string
  userId: string
  productId: string
  qty: number
}

export interface OrderItem {
  productId: string
  name: string
  price: number
  qty: number
  image: string
}

/** 订单 */
export interface Order {
  id: string
  userId: string
  items: OrderItem[]
  total: number
  status: string
  address: string
  createdAt: number
}

// ---------- 以下为随包内置的静态内容（不写库） ----------

export interface GuideCategory {
  id: string
  name: string
  icon: string
  desc: string
  color: string
}

export interface GuideArticle {
  id: string
  categoryId: string
  title: string
  cover: string
  summary: string
  /** 段落数组，支持 "## " 开头表示小标题 */
  content: string[]
  tags: string[]
}

export type SlideTarget = 'guide' | 'forum' | 'shop'

export interface Slide {
  id: string
  image: string
  title: string
  subtitle: string
  target: SlideTarget
  /** 目标板块内的具体 id，可选 */
  targetId?: string
}
