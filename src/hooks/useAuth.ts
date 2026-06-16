import { useEffect, useState } from 'react'
import * as webAuth from 'firebase/auth'
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth'
import * as extensionAuth from 'firebase/auth/web-extension'
import { auth, googleProvider } from '../firebase'
import { signInWithGoogleExtension } from '../lib/extensionAuth'
import {
  isContentScriptContext,
  isExtensionPageContext,
  isExtensionRuntime,
} from '../lib/runtimeContext'
import type { User } from 'firebase/auth'

const extensionPage = isExtensionPageContext()
const contentScript = isContentScriptContext()
const authApi = extensionPage ? extensionAuth : webAuth

function getErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err && 'message' in err) {
    return `${String(err.code)}: ${String(err.message)}`
  }

  return err instanceof Error ? err.message : 'Failed to sign in with Google'
}

async function signInFromContentScript(): Promise<void> {
  const response = (await chrome.runtime.sendMessage({
    type: 'GOOGLE_SIGN_IN',
  })) as { ok?: boolean; accessToken?: string; error?: string }

  if (!response?.ok || !response.accessToken) {
    throw new Error(response?.error ?? 'Sign-in failed')
  }

  const credential = GoogleAuthProvider.credential(null, response.accessToken)
  await signInWithCredential(auth, credential)
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      if (extensionPage) {
        await signInWithGoogleExtension()
      } else if (contentScript) {
        await signInFromContentScript()
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
    inExtension: isExtensionRuntime(),
  }
}
