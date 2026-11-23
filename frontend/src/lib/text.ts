/**
 * Text direction for user content in a Hebrew-first UI.
 */

const HEBREW = /[֐-׿]/;
const LATIN = /[A-Za-z]/;

/**
 * Pick the direction to display a piece of user text in.
 *
 * Developer note: the browser's dir="auto" follows the first strong letter, so
 * "EASS שיעור 2: HTTP" would render left to right with its Hebrew words in the
 * wrong order. Here any Hebrew letter makes the text right to left; only text
 * with Latin letters and no Hebrew at all (an English course name) is shown
 * left to right.
 *
 * @param text The text to show.
 * @returns "rtl" or "ltr".
 */
export function dirOf(text: string | null | undefined): "rtl" | "ltr" {
  return text && !HEBREW.test(text) && LATIN.test(text) ? "ltr" : "rtl";
}
