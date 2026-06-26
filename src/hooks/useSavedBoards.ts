import { useEffect, useState } from 'react'
import { collection, onSnapshot, type Timestamp } from 'firebase/firestore'
import { db } from '../firebase'

export interface SavedBoardSummary {
  slug: string
  updatedAt: Date | null
}

interface BoardListDocument {
  updatedAt?: Timestamp | null
}

function toDate(value: Timestamp | null | undefined): Date | null {
  return value?.toDate() ?? null
}

/**
 * List saved whiteboards for the signed-in user (metadata only).
 */
export function useSavedBoards(userId: string | null) {
  const [boards, setBoards] = useState<SavedBoardSummary[]>([])
  const [loading, setLoading] = useState(Boolean(userId))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setBoards([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    const unsubscribe = onSnapshot(
      collection(db, 'users', userId, 'boards'),
      (snapshot) => {
        const next = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data() as BoardListDocument
            return {
              slug: docSnap.id,
              updatedAt: toDate(data.updatedAt),
            }
          })
          .sort((a, b) => {
            const aTime = a.updatedAt?.getTime() ?? 0
            const bTime = b.updatedAt?.getTime() ?? 0
            return bTime - aTime
          })

        setBoards(next)
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )

    return unsubscribe
  }, [userId])

  return { boards, loading, error }
}
