const MAX_EMBEDDED_IMAGE_LENGTH = 1_000_000;
const SAFE_IMAGE_DATA_URL = /^data:image\/(?:gif|jpeg|png|webp);base64,[a-z0-9+/]*={0,2}$/i;

export function persistableUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }
  return url.length <= MAX_EMBEDDED_IMAGE_LENGTH && SAFE_IMAGE_DATA_URL.test(url) ? url : null;
}
