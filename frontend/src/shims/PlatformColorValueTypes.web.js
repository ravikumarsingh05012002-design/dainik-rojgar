// Web fallback for React Native internal color object processing.
// For web, return the object as-is so processColor can continue gracefully.
export function processColorObject(color) {
  return color;
}
