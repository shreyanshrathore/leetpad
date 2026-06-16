import { useEffect, useState } from 'react'
import * as webAuth from 'firebase/auth'
import * as extensionAuth from 'firebase/auth/web-extension'
import { auth, googleProvider } from '../firebase'
import { signInWithGoogleExtension } from '../lib/extensionAuth'
import { isExtensionContext } from '../lib/isExtension'
import type { User } from 'firebase/auth'

const authApi = isExtensionContext() ? extensionAuth : webAuth

function getErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err && 'message' in err) {
    return `${String(err.code)}: ${String(err.message)}`
  }

  return err instanceof Error ? err.message : 'Failed to sign in with Google'
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const inExtension = isExtensionContext()

  useEffect(() => {
    const unsubscribe = authApi.onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  async function signInWithGoogle() {
    setError(null)
    try {
      if (inExtension) {
        await signInWithGoogleExtension()
      } else {
        await webAuth.signInWithPopup(auth, googleProvider)
      }
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function logout() {
    setError(null)
    await authApi.signOut(auth)
  }

  return {
    user,
    loading,
    error,
    signInWithGoogle,
    logout,
    inExtension,
  }
}
