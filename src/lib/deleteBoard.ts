import { deleteDoc, doc } from 'firebase/firestore'
import { db } from '../firebase'

export async function deleteBoard(userId: string, problemSlug: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'boards', problemSlug))
}
