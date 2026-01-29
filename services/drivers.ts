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
  onSnapshot,
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore'
import { getDb } from '@/lib/firebase-config'
import { DeliveryDriver, Delivery, DriverPerformance } from '@/lib/types'
import { getDeliveriesByDriver } from './deliveries'

// Driver CRUD Operations
export async function createDriver(driverData: Omit<DeliveryDriver, 'id' | 'createdAt'>): Promise<string> {
  try {
    const db = await getDb()
    const driverRef = collection(db, 'delivery_drivers')
    const driver = {
      ...driverData,
      createdAt: Timestamp.now()
    }
    const docRef = await addDoc(driverRef, driver)
    
    return docRef.id
  } catch (error) {
    console.error('Error creating driver:', error)
    throw new Error('Failed to create driver')
  }
}

export async function updateDriver(driverId: string, updates: Partial<DeliveryDriver>): Promise<void> {
  try {
    const db = await getDb()
    const driverRef = doc(db, 'delivery_drivers', driverId)
    await updateDoc(driverRef, updates)
  } catch (error) {
    console.error('Error updating driver:', error)
    throw new Error('Failed to update driver')
  }
}

export async function deleteDriver(driverId: string): Promise<void> {
  try {
    // Check if driver has any deliveries
    const deliveries = await getDeliveriesByDriver(driverId)
    if (deliveries.length > 0) {
      throw new Error('Cannot delete driver with existing deliveries')
    }
    const db = await getDb()
    const driverRef = doc(db, 'delivery_drivers', driverId)
    await deleteDoc(driverRef)
  } catch (error) {
    console.error('Error deleting driver:', error)
    throw error
  }
}

export async function toggleDriverStatus(driverId: string, isActive: boolean): Promise<void> {
  try {
    const db = await getDb()
    const driverRef = doc(db, 'delivery_drivers', driverId)
    await updateDoc(driverRef, { isActive })
  } catch (error) {
    console.error('Error toggling driver status:', error)
    throw new Error('Failed to toggle driver status')
  }
}

// Driver Queries
export async function getDriver(driverId: string): Promise<DeliveryDriver | null> {
  try {
    const db = await getDb()
    const driverRef = doc(db, 'delivery_drivers', driverId)
    const driverSnap = await getDoc(driverRef)
    
    if (!driverSnap.exists()) {
      return null
    }
    
    return { id: driverSnap.id, ...driverSnap.data() } as DeliveryDriver
  } catch (error) {
    console.error('Error getting driver:', error)
    throw new Error('Failed to get driver')
  }
}

export async function getAllDrivers(): Promise<DeliveryDriver[]> {
  try {
    const db = await getDb()
    const driversRef = collection(db, 'delivery_drivers')
    const q = query(driversRef, orderBy('name', 'asc'))
    const snapshot = await getDocs(q)
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as DeliveryDriver[]
  } catch (error) {
    console.error('Error getting drivers:', error)
    throw new Error('Failed to get drivers')
  }
}

export async function getActiveDrivers(): Promise<DeliveryDriver[]> {
  try {
    const db = await getDb()
    const driversRef = collection(db, 'delivery_drivers')
    const q = query(
      driversRef,
      where('isActive', '==', true),
      orderBy('name', 'asc')
    )
    const snapshot = await getDocs(q)
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as DeliveryDriver[]
  } catch (error) {
    console.error('Error getting active drivers:', error)
    throw new Error('Failed to get active drivers')
  }
}

export function subscribeToDrivers(callback: (drivers: DeliveryDriver[]) => void): () => void {
  let unsubscribe: (() => void) | null = null
  
  getDb().then(db => {
    const driversRef = collection(db, 'delivery_drivers')
    const q = query(driversRef, orderBy('name', 'asc'))
    
    unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      const drivers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DeliveryDriver[]
      callback(drivers)
    }, (error) => {
      console.error('Error in drivers subscription:', error)
    })
  })
  
  return () => {
    if (unsubscribe) unsubscribe()
  }
}

// Driver Statistics
export async function getDriverStatistics(driverId: string, startDate?: string, endDate?: string): Promise<{
  totalDeliveries: number
  totalOrders: number
  totalEarnings: number
  completedDeliveries: number
  pendingDeliveries: number
  inTransitDeliveries: number
}> {
  try {
    let deliveries = await getDeliveriesByDriver(driverId)
    
    // Filter by date range if provided
    if (startDate && endDate) {
      deliveries = deliveries.filter(d => d.deliveryDate >= startDate && d.deliveryDate <= endDate)
    }
    
    const stats = {
      totalDeliveries: deliveries.length,
      totalOrders: 0,
      totalEarnings: 0,
      completedDeliveries: 0,
      pendingDeliveries: 0,
      inTransitDeliveries: 0
    }
    
    for (const delivery of deliveries) {
      stats.totalOrders += delivery.orderIds.length
      stats.totalEarnings += delivery.deliveryPrice
      
      if (delivery.status === 'completed') {
        stats.completedDeliveries++
      } else if (delivery.status === 'pending') {
        stats.pendingDeliveries++
      } else if (delivery.status === 'in_transit') {
        stats.inTransitDeliveries++
      }
    }
    
    return stats
  } catch (error) {
    console.error('Error getting driver statistics:', error)
    throw new Error('Failed to get driver statistics')
  }
}

export async function getDriverPerformance(driverId: string, weekStart: string, weekEnd: string): Promise<DriverPerformance | null> {
  try {
    const driver = await getDriver(driverId)
    if (!driver) return null
    
    let deliveries = await getDeliveriesByDriver(driverId)
    deliveries = deliveries.filter(d => d.deliveryDate >= weekStart && d.deliveryDate <= weekEnd)
    
    const performance: DriverPerformance = {
      driverId: driver.id,
      driverName: driver.name,
      deliveriesCount: deliveries.length,
      ordersCount: 0,
      totalEarnings: 0
    }
    
    for (const delivery of deliveries) {
      performance.ordersCount += delivery.orderIds.length
      performance.totalEarnings += delivery.deliveryPrice
    }
    
    return performance
  } catch (error) {
    console.error('Error getting driver performance:', error)
    throw new Error('Failed to get driver performance')
  }
}

// Helper: Get driver with statistics
export async function getDriverWithStats(driverId: string): Promise<{
  driver: DeliveryDriver
  stats: {
    totalDeliveries: number
    totalOrders: number
    totalEarnings: number
    completedDeliveries: number
  }
} | null> {
  try {
    const driver = await getDriver(driverId)
    if (!driver) return null
    
    const stats = await getDriverStatistics(driverId)
    
    return {
      driver,
      stats
    }
  } catch (error) {
    console.error('Error getting driver with stats:', error)
    throw new Error('Failed to get driver with stats')
  }
}
