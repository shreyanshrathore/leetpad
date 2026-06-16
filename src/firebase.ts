import { initializeApp } from 'firebase/app'
import { getAuth as getWebAuth, GoogleAuthProvider as WebGoogleProvider } from 'firebase/auth'
import {
  getAuth as getExtensionAuth,
  GoogleAuthProvider as ExtensionGoogleProvider,
} from 'firebase/auth/web-extension'
import { getFirestore } from 'firebase/firestore'
import { isExtensionContext } from './lib/isExtension'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Initialize Firebase once and reuse across the app.
export const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)

const useExtensionAuth = isExtensionContext()

// Chrome extensions must use the web-extension auth build.
export const auth = useExtensionAuth ? getExtensionAuth(app) : getWebAuth(app)
export const googleProvider = useExtensionAuth
  ? new ExtensionGoogleProvider()
  : new WebGoogleProvider()
