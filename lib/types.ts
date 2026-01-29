import { Role } from './roles';

export interface User {
  uid: string
  id: string
  email: string | null
  displayName: string | null
  role: Role
  department?: string
  departmentId?: string
  organizationId?: string
  createdAt: Date
  updatedAt?: Date
  lastLoginAt?: Date
  isActive: boolean
  
  sessionId?: string
  ipAddress?: string
  mfaEnabled?: boolean
  mfaVerified?: boolean
  passwordLastChanged?: Date
  failedLoginAttempts?: number
  lockedUntil?: Date
  
  phoneNumber?: string
  avatar?: string
  timezone?: string
  language?: string
  
  metadata?: Record<string, any>
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
  isActive: boolean
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
  deliveryId?: string
}

export interface NewOrderNotificationPayload {
  id: string
  userName?: string
  selectedOptionName: string
  orderDate: string
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

// Delivery Management Types
export type DeliveryMethod = "motorcycle" | "taxi"
export type DeliveryStatus = "pending" | "in_transit" | "completed"

export interface DeliveryDriver {
  id: string
  name: string
  phone?: string
  isActive: boolean
  createdAt: FirestoreDate
}

export interface Delivery {
  id: string
  menuId: string
  deliveryMethod: DeliveryMethod
  driverId?: string
  driverName?: string
  taxiServiceName?: string
  orderIds: string[]
  deliveryDate: string
  deliveryTime: string
  deliveryPrice: number
  status: DeliveryStatus
  createdAt: FirestoreDate
  updatedAt?: FirestoreDate
  completedAt?: FirestoreDate
  notes?: string
}

export interface DeliveryWithOrders extends Delivery {
  orders: Order[]
}

export interface DriverPerformance {
  driverId: string
  driverName: string
  deliveriesCount: number
  ordersCount: number
  totalEarnings: number
}

export interface WeeklyDeliveryReport {
  weekStart: string
  weekEnd: string
  totalDeliveries: number
  totalOrdersDelivered: number
  motorcycleCount: number
  taxiCount: number
  motorcycleCost: number
  taxiCost: number
  totalCost: number
  driverPerformance: DriverPerformance[]
}
