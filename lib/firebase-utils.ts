import { 
  collection, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  onSnapshot,
  type Unsubscribe
} from "firebase/firestore";
import { getDb } from "@/lib/firebase-config";

export async function getDocument<T>(
  collectionName: string, 
  documentId: string
): Promise<T | null> {
  try {
    const db = await getDb();
    const docRef = doc(db, collectionName, documentId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as T;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching document ${documentId} from ${collectionName}:`, error);
    throw error;
  }
}

export async function addDocument<T>(
  collectionName: string, 
  data: Omit<T, 'id'>
): Promise<string> {
  try {
    const db = await getDb();
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return docRef.id;
  } catch (error) {
    console.error(`Error adding document to ${collectionName}:`, error);
    throw error;
  }
}

export async function updateDocument<T>(
  collectionName: string, 
  documentId: string, 
  data: Partial<T>
): Promise<void> {
  try {
    const db = await getDb();
    const docRef = doc(db, collectionName, documentId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error(`Error updating document ${documentId} in ${collectionName}:`, error);
    throw error;
  }
}

export async function deleteDocument(
  collectionName: string, 
  documentId: string
): Promise<void> {
  try {
    const db = await getDb();
    const docRef = doc(db, collectionName, documentId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Error deleting document ${documentId} from ${collectionName}:`, error);
    throw error;
  }
}

export function subscribeToCollection<T>(
  collectionName: string,
  callback: (documents: T[]) => void,
  constraints: any[] = []
): Unsubscribe {
  return new Promise(async (resolve) => {
    try {
      const db = await getDb();
      const q = query(collection(db, collectionName), ...constraints);
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const documents = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as T[];
        callback(documents);
      }, (error) => {
        console.error(`Error in real-time subscription for ${collectionName}:`, error);
      });
      
      resolve(unsubscribe);
    } catch (error) {
      console.error(`Error setting up subscription for ${collectionName}:`, error);
      throw error;
    }
  }) as any;
}

export function subscribeToDocument<T>(
  collectionName: string,
  documentId: string,
  callback: (document: T | null) => void
): Unsubscribe {
  return new Promise(async (resolve) => {
    try {
      const db = await getDb();
      const docRef = doc(db, collectionName, documentId);
      
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const document = { id: docSnap.id, ...docSnap.data() } as T;
          callback(document);
        } else {
          callback(null);
        }
      }, (error) => {
        console.error(`Error in real-time subscription for document ${documentId}:`, error);
      });
      
      resolve(unsubscribe);
    } catch (error) {
      console.error(`Error setting up document subscription for ${documentId}:`, error);
      throw error;
    }
  }) as any;
}

export function normalizeFirestoreDate(date: any): Date {
  if (date && typeof date.toDate === 'function') {
    return date.toDate();
  }
  if (date instanceof Date) {
    return date;
  }
  if (typeof date === 'string' || typeof date === 'number') {
    return new Date(date);
  }
  return new Date();
}

export async function batchOperations(operations: (() => Promise<void>)[]): Promise<void> {
  try {
    await Promise.all(operations.map(op => op()));
  } catch (error) {
    console.error('Error in batch operations:', error);
    throw error;
  }
}

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError!;
}
