-- This is a reference for creating an admin user document in Firestore
-- You'll need to do this manually in the Firebase Console after a user signs up

-- Go to Firebase Console > Firestore Database > Data
-- Create a document in the 'users' collection with the following structure:

-- Document ID: [USER_UID_FROM_AUTHENTICATION]
-- Fields:
{
  "uid": "[USER_UID]",
  "email": "admin@yourcompany.com",
  "displayName": "Admin User",
  "role": "admin",
  "department": "IT",
  "position": "System Administrator",
  "preferences": {
    "notifications": true,
    "autoOrder": false,
    "favoriteItems": []
  },
  "createdAt": "[CURRENT_TIMESTAMP]",
  "isActive": true
}

-- Make sure to replace [USER_UID] with the actual UID from Firebase Authentication
-- The role field is crucial - it must be set to "admin" for admin privileges
