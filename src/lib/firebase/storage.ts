import { getBucket } from "./config";

/**
 * Upload a user-owned file to Firebase Storage under users/{uid}/…
 * Returns the public download URL and the object path (needed to delete it).
 */
export async function uploadUserFile(
  uid: string,
  relativePath: string,
  blob: Blob,
): Promise<{ url: string; storagePath: string }> {
  const bucket = getBucket();
  if (!bucket) throw new Error("Firebase Storage is not configured.");
  const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
  const storagePath = `users/${uid}/${relativePath}`;
  const objectRef = ref(bucket, storagePath);
  await uploadBytes(objectRef, blob, {
    contentType: blob.type || "application/octet-stream",
    cacheControl: "private, max-age=31536000",
  });
  return { url: await getDownloadURL(objectRef), storagePath };
}

export async function deleteUserFile(storagePath: string): Promise<void> {
  const bucket = getBucket();
  if (!bucket) return;
  const { ref, deleteObject } = await import("firebase/storage");
  try {
    await deleteObject(ref(bucket, storagePath));
  } catch (err) {
    // Already gone is fine; anything else is worth knowing about.
    if ((err as { code?: string }).code !== "storage/object-not-found") throw err;
  }
}
