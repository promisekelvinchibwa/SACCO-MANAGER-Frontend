// DRF sends errors in a few different shapes depending on where they came
// from: a plain array (["message"]) from a raw ValidationError, a dict
// like {"detail": "message"} from permission/auth failures, or a dict of
// field errors like {"national_id": ["message"]} from a serializer. A
// non-DRF failure (auth proxy, CORS, an unhandled 500) can also come back
// as a raw HTML/text string. Indexing that last case with [0] silently
// grabs its first character instead of throwing -- which is how a real
// error turns into a single stray letter on screen instead of a useful
// message. This function normalizes all of those shapes into one string.
export function extractErrorMessage(err, fallback) {
  const data = err.response?.data;
  if (data == null) return err.message || fallback;

  if (typeof data === "string") {
    // Raw HTML (e.g. a Django debug/500 page) isn't useful to show as-is.
    return data.trim().startsWith("<") ? fallback : data;
  }
  if (Array.isArray(data)) {
    return typeof data[0] === "string" ? data[0] : fallback;
  }
  if (typeof data === "object") {
    if (typeof data.detail === "string") return data.detail;
    const firstKey = Object.keys(data)[0];
    const val = firstKey ? data[firstKey] : null;
    if (Array.isArray(val) && typeof val[0] === "string") return val[0];
    if (typeof val === "string") return val;
  }
  return fallback;
}