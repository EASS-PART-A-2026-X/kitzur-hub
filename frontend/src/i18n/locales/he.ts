/**
 * Hebrew strings. This file is the source of truth for translation keys:
 * every other locale must provide the same keys (enforced by the Locale type).
 */
const he = {
  app: {
    name: "Kitzur Hub",
    tagline: "מרכז הלמידה של הקורס",
  },
  common: {
    retry: "נסו שוב",
    loading: "טוען...",
  },
  courses: {
    title: "הקורסים שלי",
    empty: "עוד אין קורסים. צרו קורס ראשון כדי להתחיל.",
  },
  notFound: {
    title: "העמוד לא נמצא",
    back: "חזרה לקורסים",
  },
  errors: {
    validation: "חלק מהשדות לא תקינים.",
    not_found: "הפריט לא נמצא. ייתכן שנמחק.",
    conflict: "הפריט כבר קיים.",
    too_large: "הקובץ גדול מדי.",
    unsupported: "סוג הקובץ אינו נתמך.",
    server: "אירעה שגיאה בשרת. נסו שוב בעוד רגע.",
    unreachable: "השרת לא זמין כרגע. בדקו שהוא רץ ונסו שוב.",
    unknown_outcome: "החיבור נותק לפני שהתקבלה תשובה. ייתכן שהשינוי נשמר, רעננו כדי לבדוק.",
  },
  validation: {
    missing: "שדה חובה.",
    string_too_short: "קצר מדי.",
    string_too_long: "ארוך מדי (עד {{max_length}} תווים).",
    greater_than_equal: "הערך חייב להיות לפחות {{ge}}.",
    less_than_equal: "הערך חייב להיות לכל היותר {{le}}.",
    extra_forbidden: "שדה לא מוכר.",
    date_from_datetime_parsing: "תאריך לא תקין.",
    datetime_from_date_parsing: "תאריך ושעה לא תקינים.",
    enum: "ערך לא חוקי.",
    fallback: "ערך לא תקין.",
  },
} as const;

/** Same tree as `he`, with every leaf widened to string (for other locales). */
export type Locale = {
  [Section in keyof typeof he]: { [Key in keyof (typeof he)[Section]]: string };
};

export default he;
