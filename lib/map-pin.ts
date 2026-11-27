import type { VenuePin } from "@/lib/api/venue-locations";

const NUMBER = "(-?\\d{1,3}(?:\\.\\d+)?)";
/** Where a spot hides in what people paste, most exact first. */
const PATTERNS = [
  // A Google Maps place address: !3d<lat>!4d<lng> is the place itself.
  new RegExp(`!3d${NUMBER}!4d${NUMBER}`),
  // ?q=lat,lng and the like.
  new RegExp(`[?&](?:q|query|ll|destination)=${NUMBER}(?:,|%2C)\\s*${NUMBER}`, "i"),
  // …/@lat,lng,17z is the middle of the map.
  new RegExp(`@${NUMBER},${NUMBER}`),
  // Just the two numbers.
  new RegExp(`^\\s*${NUMBER}\\s*[,;\\s]\\s*${NUMBER}\\s*$`),
];

/** About 10 cm: more decimals than that mean nothing on a map. */
export const roundPin = (latitude: number, longitude: number): VenuePin => ({ latitude: Number(latitude.toFixed(6)), longitude: Number(longitude.toFixed(6)) });

/** A pin from "9.0108, 38.7613" or a Google Maps address; null when the text holds no spot. */
export function parsePin(text: string): VenuePin | null {
  for (const pattern of PATTERNS) {
    const found = text.match(pattern);
    if (!found) continue;
    const latitude = Number(found[1]);
    const longitude = Number(found[2]);
    if (Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180) return roundPin(latitude, longitude);
  }
  return null;
}
