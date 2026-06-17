export function isImageMime(mime: string) {
  return mime.startsWith("image/");
}

export function isVideoMime(mime: string) {
  return mime.startsWith("video/");
}
