/**
 * The home page's 3D map: city points and the outline of Syria in one 0–100 frame, so a city's pin
 * sits on the outline it belongs to. Simple equirectangular projection over Syria's bounding box;
 * at this size the distortion is invisible. Coordinates are approximate city centres.
 */
export const CITY_COORDS: Record<string, readonly [lat: number, lng: number]> = {
  damascus: [33.5115, 36.3065],
  aleppo: [36.2021, 37.1343],
  latakia: [35.5317, 35.7901],
  bloudan: [33.7286, 36.1318],
  homs: [34.7324, 36.7137],
  hama: [35.1318, 36.7578],
  tartous: [34.889, 35.8866],
  idlib: [35.9306, 36.6339],
  daraa: [32.6189, 36.1021],
  suwayda: [32.709, 36.5666],
  quneitra: [33.1259, 35.8245],
  palmyra: [34.5503, 38.2691],
  raqqa: [35.9528, 39.0079],
  'deir-ez-zor': [35.3359, 40.1408],
  hasakah: [36.5024, 40.7477],
  'mashta-al-helu': [34.8668, 36.2589],
  mashquita: [35.6176, 35.979],
  kasab: [35.9218, 35.9887],
  slunfeh: [35.5952, 36.1886],
  zabadani: [33.7246, 36.1007],
}

const WEST = 35.6
const NORTH = 37.4
const SPAN_LNG = 6.9
const SPAN_LAT = 5.2

/** A point in the map frame: x from west to east, y from north to south, both 0–100 with a 4% margin. */
export function mapPoint(lat: number, lng: number): { x: number; y: number } {
  const round = (v: number) => Math.round(v * 10) / 10
  return {
    x: round(4 + 0.92 * (((lng - WEST) / SPAN_LNG) * 100)),
    y: round(4 + 0.92 * (((NORTH - lat) / SPAN_LAT) * 100)),
  }
}

/** Where a city's pin goes, or null for a city with no known coordinates (it is simply not drawn). */
export function cityPoint(slug: string): { x: number; y: number } | null {
  const c = CITY_COORDS[slug]
  return c ? mapPoint(c[0], c[1]) : null
}

/**
 * Syria's outline in the same frame, from Natural Earth 1:50m admin-0 boundaries (public domain),
 * projected with mapPoint. Drawn on a viewBox of 0 0 100 100 with preserveAspectRatio="none".
 */
export const SYRIA_OUTLINE = 'M7.9 30.2L8.9 30.4L11.0 31.7L11.4 31.7L12.0 29.9L12.7 29.3L14.0 28.7L14.4 25.7L14.9 25.2L15.7 24.9L16.9 24.8L17.8 24.6L17.9 24.1L16.5 20.7L16.6 19.8L17.3 16.4L17.7 15.0L18.1 14.6L19.7 14.7L21.9 15.3L22.5 16.3L23.6 17.2L25.2 17.2L27.0 17.3L28.5 17.4L29.7 16.8L32.3 15.6L33.6 15.2L34.8 14.7L38.5 12.8L40.1 12.9L41.1 13.2L41.9 13.5L43.7 14.8L45.2 16.1L46.2 16.5L48.1 16.5L50.8 16.7L54.1 16.7L56.0 16.4L58.5 15.7L62.9 14.1L68.7 10.9L72.1 9.4L73.5 9.2L75.5 9.1L77.4 9.6L79.5 9.8L80.5 9.8L82.9 9.5L85.9 8.8L87.8 8.3L90.1 7.4L91.6 6.0L92.0 5.8L92.6 6.1L92.9 6.2L93.5 7.0L94.1 9.1L94.1 9.4L94.0 10.0L92.5 11.8L90.4 14.1L89.0 15.7L86.5 18.2L84.7 18.8L81.6 19.7L80.7 20.6L79.9 22.0L79.5 23.9L79.3 25.2L79.3 27.5L80.0 29.8L80.7 32.1L80.8 33.7L80.7 35.1L80.1 36.7L79.3 38.9L78.9 41.4L78.7 46.0L78.7 49.9L78.6 50.5L77.3 53.3L75.8 56.6L75.1 57.3L71.9 58.3L68.3 60.6L64.3 63.3L60.7 65.7L56.9 68.3L52.9 70.9L50.1 72.7L46.3 75.3L42.9 77.7L39.4 80.1L36.7 81.9L32.7 84.9L30.4 86.6L26.9 89.1L23.9 91.3L20.3 93.9L15.7 93.1L14.3 92.7L13.1 91.5L12.2 90.8L10.1 90.1L8.7 87.7L7.9 86.9L6.5 86.5L6.7 85.7L7.4 84.3L8.2 82.7L7.8 81.9L7.6 81.2L7.6 80.3L8.1 79.4L7.8 78.4L7.4 77.4L7.2 76.9L7.2 76.0L7.3 75.3L7.6 74.2L8.2 73.6L8.4 73.0L8.9 72.4L9.7 71.9L9.8 71.5L9.7 71.3L9.0 70.8L8.5 70.0L8.9 68.9L9.2 68.5L9.6 68.0L10.6 67.1L11.3 67.0L12.0 67.0L13.1 67.1L14.0 67.2L14.2 67.0L14.2 66.7L13.1 66.0L13.1 65.5L13.3 64.9L14.1 64.0L15.0 63.3L15.4 63.1L16.5 61.8L17.1 60.2L16.1 56.5L15.4 55.9L14.4 55.4L13.7 55.3L13.7 55.1L14.5 54.1L15.1 53.3L14.5 52.5L13.3 52.1L12.9 53.0L11.3 53.0L9.0 53.0L8.0 49.1L7.8 47.4L7.9 45.4L8.6 42.5L8.3 41.2L8.2 40.3L8.0 39.0L6.2 36.4L7.2 31.4L7.9 30.2Z'
