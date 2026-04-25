import type { BlockContentV2, BlockStyle, BlockMedia, DeviceValue, Device } from "./types"

/**
 * Resolve a DeviceValue<T> to a concrete T for the given device.
 *
 * Rules:
 *  - If value is null/undefined: return undefined
 *  - If value is a primitive (string, number, boolean): return as-is (shared)
 *  - If value is an object with "desktop" or "mobile" keys: return the
 *    matching device value, falling back to the other if not set.
 *  - Any other object is returned as-is (shared complex value).
 */
export function resolveForDevice<T>(
  value: DeviceValue<T> | undefined,
  device: Device
): T | undefined {
  if (value === null || value === undefined) return undefined
  if (typeof value !== "object") return value as T

  const obj = value as { desktop?: T; mobile?: T }
  if ("desktop" in obj || "mobile" in obj) {
    return device === "mobile"
      ? (obj.mobile ?? obj.desktop)
      : (obj.desktop ?? obj.mobile)
  }
  return value as T
}

/**
 * Resolve every DeviceValue field in a full block content to concrete values
 * for the given device. Returns a new BlockContentV2 with the same shape but
 * all fields flattened.
 *
 * `data` is returned as-is (text is always shared).
 */
export function resolveContentForDevice(
  content: BlockContentV2,
  device: Device
): BlockContentV2 {
  return {
    data: content.data,
    style: resolveStyle(content.style, device),
    media: resolveMedia(content.media, device),
  }
}

function resolveStyle(style: BlockStyle, device: Device): BlockStyle {
  return {
    backgroundColor: resolveForDevice(style.backgroundColor, device),
    textColor: resolveForDevice(style.textColor, device),
    paddingY: resolveForDevice(style.paddingY, device),
    paddingTop: resolveForDevice(style.paddingTop, device),
    paddingBottom: resolveForDevice(style.paddingBottom, device),
    textSize: resolveForDevice(style.textSize, device),
    textWeight: resolveForDevice(style.textWeight, device),
    alignment: resolveForDevice(style.alignment, device),
    containerWidth: resolveForDevice(style.containerWidth, device),
    cornerRadius: style.cornerRadius,
    border: style.border,
    shadow: style.shadow,
    visibility: style.visibility,
    backgroundGradient: style.backgroundGradient,
  }
}

function resolveMedia(media: BlockMedia, device: Device): BlockMedia {
  const resolveImagePair = (pair: { desktop?: string; mobile?: string } | undefined) => {
    if (!pair) return undefined
    const v = device === "mobile" ? (pair.mobile ?? pair.desktop) : (pair.desktop ?? pair.mobile)
    return v ? { desktop: v, mobile: v } : undefined
  }
  return {
    image: resolveImagePair(media.image),
    bgImage: resolveImagePair(media.bgImage),
    bgOverlay: resolveImagePair(media.bgOverlay),
  }
}
