"use client"

import { 
  collection, 
  doc, 
  getDocs,
  updateDoc,
  query,
  where,
  writeBatch,
  Timestamp
} from 'firebase/firestore'
import { getDb } from '@/lib/firebase-config'
import { Menu } from '@/lib/types'

// Get the currently active menu
export async function getActiveMenu(): Promise<Menu | null> {
  try {
    const db = await getDb()
    const menusRef = collection(db, 'menus')
    const q = query(
      menusRef,
      where('isActive', '==', true),
      where('isPublished', '==', true)
    )
    const snapshot = await getDocs(q)
    
    if (snapshot.empty) {
      return null
    }
    
    // Should only be one active menu
    const menuDoc = snapshot.docs[0]
    return { id: menuDoc.id, ...menuDoc.data() } as Menu
  } catch (error) {
    console.error('Error getting active menu:', error)
    throw new Error('Failed to get active menu')
  }
}

// Set a menu as active (deactivates all others)
export async function setActiveMenu(menuId: string): Promise<void> {
  try {
    const db = await getDb()
    const batch = writeBatch(db)
    
    // First, deactivate all menus
    const menusRef = collection(db, 'menus')
    const activeMenusQuery = query(menusRef, where('isActive', '==', true))
    const activeMenusSnapshot = await getDocs(activeMenusQuery)
    
    activeMenusSnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { isActive: false })
    })
    
    // Then activate the selected menu
    const menuRef = doc(db, 'menus', menuId)
    batch.update(menuRef, { 
      isActive: true,
      isPublished: true, // Active menu must be published
      updatedAt: Timestamp.now()
    })
    
    await batch.commit()
  } catch (error) {
    console.error('Error setting active menu:', error)
    throw new Error('Failed to set active menu')
  }
}

// Deactivate a menu
export async function deactivateMenu(menuId: string): Promise<void> {
  try {
    const db = await getDb()
    const menuRef = doc(db, 'menus', menuId)
    await updateDoc(menuRef, { 
      isActive: false,
      updatedAt: Timestamp.now()
    })
  } catch (error) {
    console.error('Error deactivating menu:', error)
    throw new Error('Failed to deactivate menu')
  }
}

// Get all published menus (for selection)
export async function getPublishedMenus(): Promise<Menu[]> {
  try {
    const db = await getDb()
    const menusRef = collection(db, 'menus')
    const q = query(menusRef, where('isPublished', '==', true))
    const snapshot = await getDocs(q)
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Menu[]
  } catch (error) {
    console.error('Error getting published menus:', error)
    throw new Error('Failed to get published menus')
  }
}
