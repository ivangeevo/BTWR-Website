// The Outpost is desktop-only. A "phone" here means a touch-first device —
// no hover and a coarse primary pointer (phones, tablets), or a mobile user
// agent — NOT a narrow window: a desktop browser resized small is still a
// desktop (and resizing the window is even one of the Outpost's secrets).
// Every Outpost-driven effect (the homepage section, the sky cycle, snow,
// the header gear) treats a phone as "Outpost off", whatever the save says.
export const TOUCH_FIRST_QUERY = "(hover: none) and (pointer: coarse)";
const MOBILE_UA = /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle|BlackBerry|Opera Mini|IEMobile/i;

export function isPhoneDevice(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia(TOUCH_FIRST_QUERY).matches) return true;
    return MOBILE_UA.test(window.navigator.userAgent);
  } catch {
    return false;
  }
}
