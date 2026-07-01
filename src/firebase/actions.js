import { setDocMerge, removeDoc, addAutoDoc } from './firestore';

/**
 * Generic "create with auto-incrementing numeric id" helper, matching the
 * original app's counters/{nextXId} pattern but without blocking the UI —
 * the Firestore write happens in the background while local state updates
 * immediately (optimistic update).
 */
export async function createWithId(collectionName, id, data) {
  await setDocMerge(collectionName, id, { id, ...data });
  return id;
}

export async function updateById(collectionName, id, data) {
  return setDocMerge(collectionName, id, data);
}

export async function deleteById(collectionName, id) {
  return removeDoc(collectionName, id);
}

export async function createAutoId(collectionName, data) {
  return addAutoDoc(collectionName, data);
}
