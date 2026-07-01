// ============================================================
// storage.js — Firebase Storage (modular SDK ONLY)
//
// The original app declared a storageBucket in its config but never
// actually used Firebase Storage anywhere (products only ever stored an
// emoji as an "icon"). This file adds real upload/delete helpers so
// products, suppliers, or the business profile can use actual photos —
// wire these into ProductModal.jsx, Settings.jsx etc. if/when you want a
// camera/upload button instead of (or alongside) the emoji icon field.
// ============================================================
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { app } from './firebase';

export const storage = getStorage(app);

/**
 * Upload a single image file and return its public download URL.
 * @param {File} file - from an <input type="file"> change event
 * @param {string} path - e.g. `products/${productId}.jpg`
 */
export async function uploadImage(file, path) {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}

/** Delete a previously uploaded file by its storage path. */
export async function deleteImage(path) {
  return deleteObject(ref(storage, path));
}

/** Convenience path builders so callers don't hand-construct paths. */
export const storagePaths = {
  productImage: (productId, ext = 'jpg') => `products/${productId}.${ext}`,
  supplierLogo: (supplierId, ext = 'jpg') => `suppliers/${supplierId}.${ext}`,
  businessLogo: () => 'business/logo.png'
};
