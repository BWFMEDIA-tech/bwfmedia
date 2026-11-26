/** Center-crop an image file to a 1:1 square JPEG (max 3000px). Returns the original file if it can't be decoded. */
export function squareCropRect(w: number, h: number) {
  const size = Math.min(w, h);
  return { sx: Math.round((w - size) / 2), sy: Math.round((h - size) / 2), size };
}

export async function cropImageToSquare(file: File, maxSize = 3000): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const { width: w, height: h } = bitmap;
    if (w === h && w <= maxSize) { bitmap.close(); return file; }
    const { sx, sy, size } = squareCropRect(w, h);
    const out = Math.min(size, maxSize);
    const canvas = document.createElement("canvas");
    canvas.width = out; canvas.height = out;
    const ctx = canvas.getContext("2d");
    if (!ctx) { bitmap.close(); return file; }
    ctx.drawImage(bitmap, sx, sy, size, size, 0, 0, out, out);
    bitmap.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.92));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}
