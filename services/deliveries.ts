"use client"

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  Timestamp,
  writeBatch,
  onSnapshot,
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore'
import { getDb } from '@/lib/firebase-config'
import { Delivery, DeliveryDriver, Order, DeliveryWithOrders, WeeklyDeliveryReport, DriverPerformance } from '@/lib/types'
import { getActiveMenu } from './menus'

// Delivery CRUD Operations
export async function createDelivery(deliveryData: Omit<Delivery, 'id' | 'createdAt' | 'updatedAt' | 'menuId'>): Promise<string> {
  try {
    const db = await getDb()
    const batch = writeBatch(db)
    
    // Get active menu
    const activeMenu = await getActiveMenu()
    if (!activeMenu) {
      throw new Error('No active menu found. Please set an active menu before creating deliveries.')
    }
    
    // Create delivery document
    const deliveryRef = doc(collection(db, 'deliveries'))
    const delivery: Omit<Delivery, 'id'> = {
      ...deliveryData,
      menuId: activeMenu.id,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }
    batch.set(deliveryRef, delivery)
    
    // Update all orders with deliveryId
    for (const orderId of deliveryData.orderIds) {
      const orderRef = doc(db, 'orders', orderId)
      batch.update(orderRef, { 
        deliveryId: deliveryRef.id,
        updatedAt: Timestamp.now()
      })
    }
    
    // Commit batch
    await batch.commit()
    
    // Audit log
    await logDeliveryAction('create', deliveryRef.id, deliveryData)
    
    return deliveryRef.id
  } catch (error) {
    console.error('Error creating delivery:', error)
    throw new Error('Failed to create delivery')
  }
}

export async function updateDelivery(deliveryId: string, updates: Partial<Delivery>): Promise<void> {
  try {
    const db = await getDb()
    const deliveryRef = doc(db, 'deliveries', deliveryId)
    await updateDoc(deliveryRef, {
      ...updates,
      updatedAt: Timestamp.now()
    })
    
    // Audit log
    await logDeliveryAction('update', deliveryId, updates)
  } catch (error) {
    console.error('Error updating delivery:', error)
    throw new Error('Failed to update delivery')
  }
}

export async function completeDelivery(deliveryId: string): Promise<void> {
  try {
    const db = await getDb()
    const batch = writeBatch(db)
    
    // Get delivery
    const deliveryRef = doc(db, 'deliveries', deliveryId)
    const deliverySnap = await getDoc(deliveryRef)
    
    if (!deliverySnap.exists()) {
      throw new Error('Delivery not found')
    }
    
    const delivery = deliverySnap.data() as Delivery
    
    // Update delivery status
    batch.update(deliveryRef, {
      status: 'completed',
      completedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    })
    
    // Update all orders to delivered
    for (const orderId of delivery.orderIds) {
      const orderRef = doc(db, 'orders', orderId)
      batch.update(orderRef, {
        status: 'delivered',
        updatedAt: Timestamp.now()
      })
    }
    
    await batch.commit()
    
    // Audit log
    await logDeliveryAction('complete', deliveryId, { status: 'completed' })
  } catch (error) {
    console.error('Error completing delivery:', error)
    throw new Error('Failed to complete delivery')
  }
}

export async function deleteDelivery(deliveryId: string): Promise<void> {
  try {
    const db = await getDb()
    const batch = writeBatch(db)
    
    // Get delivery
    const deliveryRef = doc(db, 'deliveries', deliveryId)
    const deliverySnap = await getDoc(deliveryRef)
    
    if (!deliverySnap.exists()) {
      throw new Error('Delivery not found')
    }
    
    const delivery = deliverySnap.data() as Delivery
    
    // Remove deliveryId from all orders
    for (const orderId of delivery.orderIds) {
      const orderRef = doc(db, 'orders', orderId)
      batch.update(orderRef, { 
        deliveryId: null,
        updatedAt: Timestamp.now()
      })
    }
    
    // Delete delivery
    batch.delete(deliveryRef)
    
    await batch.commit()
    
    // Audit log
    await logDeliveryAction('delete', deliveryId, {})
  } catch (error) {
    console.error('Error deleting delivery:', error)
    throw new Error('Failed to delete delivery')
  }
}

// Delivery Queries
export async function getDelivery(deliveryId: string): Promise<Delivery | null> {
  try {
    const db = await getDb()
    const deliveryRef = doc(db, 'deliveries', deliveryId)
    const deliverySnap = await getDoc(deliveryRef)
    
    if (!deliverySnap.exists()) {
      return null
    }
    
    return { id: deliverySnap.id, ...deliverySnap.data() } as Delivery
  } catch (error) {
    console.error('Error getting delivery:', error)
    throw new Error('Failed to get delivery')
  }
}

export async function getDeliveryWithOrders(deliveryId: string): Promise<DeliveryWithOrders | null> {
  try {
    const delivery = await getDelivery(deliveryId)
    
    if (!delivery) {
      return null
    }
    
    const db = await getDb()
    // Fetch all orders
    const orders: Order[] = []
    for (const orderId of delivery.orderIds) {
      const orderRef = doc(db, 'orders', orderId)
      const orderSnap = await getDoc(orderRef)
      if (orderSnap.exists()) {
        orders.push({ id: orderSnap.id, ...orderSnap.data() } as Order)
      }
    }
    
    return { ...delivery, orders }
  } catch (error) {
    console.error('Error getting delivery with orders:', error)
    throw new Error('Failed to get delivery with orders')
  }
}

export async function getAllDeliveries(): Promise<Delivery[]> {
  try {
    const db = await getDb()
    const deliveriesRef = collection(db, 'deliveries')
    const q = query(deliveriesRef, orderBy('createdAt', 'desc'))
    const snapshot = await getDocs(q)
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Delivery[]
  } catch (error) {
    console.error('Error getting deliveries:', error)
    throw new Error('Failed to get deliveries')
  }
}

export async function getDeliveriesByDateRange(startDate: string, endDate: string): Promise<Delivery[]> {
  try {
    const db = await getDb()
    const deliveriesRef = collection(db, 'deliveries')
    const q = query(
      deliveriesRef,
      where('deliveryDate', '>=', startDate),
      where('deliveryDate', '<=', endDate),
      orderBy('deliveryDate', 'desc')
    )
    const snapshot = await getDocs(q)
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Delivery[]
  } catch (error) {
    console.error('Error getting deliveries by date range:', error)
    throw new Error('Failed to get deliveries by date range')
  }
}

export async function getDeliveriesByDriver(driverId: string): Promise<Delivery[]> {
  try {
    const db = await getDb()
    const deliveriesRef = collection(db, 'deliveries')
    const q = query(
      deliveriesRef,
      where('driverId', '==', driverId),
      orderBy('createdAt', 'desc')
    )
    const snapshot = await getDocs(q)
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Delivery[]
  } catch (error) {
    console.error('Error getting deliveries by driver:', error)
    throw new Error('Failed to get deliveries by driver')
  }
}

export async function getDeliveriesByStatus(status: Delivery['status']): Promise<Delivery[]> {
  try {
    const db = await getDb()
    const deliveriesRef = collection(db, 'deliveries')
    const q = query(
      deliveriesRef,
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    )
    const snapshot = await getDocs(q)
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Delivery[]
  } catch (error) {
    console.error('Error getting deliveries by status:', error)
    throw new Error('Failed to get deliveries by status')
  }
}

// Real-time subscription
export function subscribeToDeliveries(callback: (deliveries: Delivery[]) => void): () => void {
  let unsubscribe: (() => void) | null = null
  
  getDb().then(db => {
    const deliveriesRef = collection(db, 'deliveries')
    const q = query(deliveriesRef, orderBy('createdAt', 'desc'))
    
    unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      const deliveries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Delivery[]
      callback(deliveries)
    }, (error) => {
      console.error('Error in deliveries subscription:', error)
    })
  })
  
  return () => {
    if (unsubscribe) unsubscribe()
  }
}

export async function generateDeliveryReport(weekStart: string, weekEnd: string): Promise<WeeklyDeliveryReport> {
  try {
    const deliveries = await getDeliveriesByDateRange(weekStart, weekEnd)
    
    let totalDeliveries = deliveries.length
    let totalOrdersDelivered = 0
    let motorcycleCount = 0
    let taxiCount = 0
    let motorcycleCost = 0
    let taxiCost = 0
    
    const driverStats = new Map<string, { name: string; deliveries: number; orders: number; earnings: number }>()
    
    for (const delivery of deliveries) {
      totalOrdersDelivered += delivery.orderIds.length
      
      if (delivery.deliveryMethod === 'motorcycle') {
        motorcycleCount++
        motorcycleCost += delivery.deliveryPrice
        
        if (delivery.driverId && delivery.driverName) {
          const stats = driverStats.get(delivery.driverId) || {
            name: delivery.driverName,
            deliveries: 0,
            orders: 0,
            earnings: 0
          }
          stats.deliveries++
          stats.orders += delivery.orderIds.length
          stats.earnings += delivery.deliveryPrice
          driverStats.set(delivery.driverId, stats)
        }
      } else if (delivery.deliveryMethod === 'taxi') {
        taxiCount++
        taxiCost += delivery.deliveryPrice
      }
    }
    
    const driverPerformance: DriverPerformance[] = Array.from(driverStats.entries()).map(([driverId, stats]) => ({
      driverId,
      driverName: stats.name,
      deliveriesCount: stats.deliveries,
      ordersCount: stats.orders,
      totalEarnings: stats.earnings
    }))
    
    return {
      weekStart,
      weekEnd,
      totalDeliveries,
      totalOrdersDelivered,
      motorcycleCount,
      taxiCount,
      motorcycleCost,
      taxiCost,
      totalCost: motorcycleCost + taxiCost,
      driverPerformance
    }
  } catch (error) {
    console.error('Error generating weekly report:', error)
    throw new Error('Failed to generate weekly report')
  }
}

// Audit Logging
async function logDeliveryAction(action: string, deliveryId: string, data: any): Promise<void> {
  try {
    const db = await getDb()
    const auditRef = collection(db, 'audit_logs')
    await addDoc(auditRef, {
      type: 'delivery',
      action,
      deliveryId,
      data,
      timestamp: Timestamp.now(),
      userId: typeof window !== 'undefined' ? localStorage.getItem('userId') : null
    })
  } catch (error) {
    console.error('Error logging delivery action:', error)
  }
}

// Helper: Get confirmed orders available for delivery
export async function getConfirmedOrdersForDelivery(date?: string): Promise<Order[]> {
  try {
    const db = await getDb()
    const ordersRef = collection(db, 'orders')

    let q = query(
      ordersRef,
      where('status', '==', 'confirmed'),
      where('deliveryId', '==', null)
    )
    
    if (date) {
      q = query(q, where('orderDate', '==', date))
    }
    
    const snapshot = await getDocs(q)
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Order[]
  } catch (error) {
    console.error('Error getting confirmed orders:', error)
    throw new Error('Failed to get confirmed orders')
  }
}
