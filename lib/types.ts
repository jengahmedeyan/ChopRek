export interface User {
  uid: string
  email: string | null
  displayName: string | null
  role: "admin" | "employee"
  department?: string
  createdAt: Date
}

export interface MenuOption {
  id: string
  name: string
  description?: string
  price?: number
  dietary: "vegetarian" | "vegan" | "gluten-free" | "regular"
  allergens?: string[]
  calories?: number
  imageUrl?: string
}

export interface Menu {
  id: string
  title: string
  description: string
  date: string
  cutoffTime: string
  options: MenuOption[]
  isPublished: boolean
  createdAt: Date
  createdBy: string
  imageUrl?: string
}

export type FirestoreDate = Date | { toDate: () => Date } | string | number

export interface Order {
  id: string
  type: "user" | "guest"
  userId?: string
  userName?: string
  userEmail?: string
  userDepartment?: string
  guestName?: string
  guestReason?: string
  menuId: string
  selectedOption: MenuOption
  quantity: number
  orderDate: string
  status: "pending" | "confirmed" | "delivered" | "cancelled"
  createdAt: FirestoreDate
  updatedAt: FirestoreDate
  totalPrice: number
}

export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: "success" | "info" | "warning" | "error" | "order_status" | "new_menu" | "reminder"
  read: boolean
  createdAt: Date
  actionUrl?: string
  metadata?: {
    orderId?: string
    menuId?: string
    orderStatus?: Order["status"]
  }
}

export interface Analytics {
  totalOrders: number
  totalRevenue: number
  popularItems: Array<{
    name: string
    count: number
    revenue: number
  }>
  ordersByStatus: Record<Order["status"], number>
  ordersByDepartment: Record<string, number>
  dailyStats: Array<{
    date: string
    orders: number
    revenue: number
  }>
}
