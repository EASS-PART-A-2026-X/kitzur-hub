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
    save: "שמירה",
    cancel: "ביטול",
    create: "יצירה",
    edit: "עריכה",
    delete: "מחיקה",
    actions: "פעולות",
  },
  courses: {
    title: "הקורסים שלי",
    empty: "עוד אין קורסים. צרו קורס ראשון כדי להתחיל.",
    new: "קורס חדש",
    edit: "עריכת קורס",
    created: "הקורס נוצר.",
    saved: "הקורס נשמר.",
    deleted: "הקורס נמחק.",
    deleteTitle: "מחיקת קורס",
    deleteConfirm: 'למחוק את "{{name}}"? כל ההרצאות, המשימות והחומרים שלו יימחקו לצמיתות.',
    lectures_one: "הרצאה אחת",
    lectures_two: "שתי הרצאות",
    lectures_other: "{{count}} הרצאות",
    openTasks_one: "משימה פתוחה אחת",
    openTasks_two: "שתי משימות פתוחות",
    openTasks_other: "{{count}} משימות פתוחות",
    nextDeadline: "המשימה הבאה: {{date}}",
    noDeadline: "אין מועדים קרובים",
    examDate: "מבחן: {{date}}",
    fields: {
      name: "שם הקורס",
      code: "קוד קורס",
      semester: "סמסטר",
      examDate: "תאריך מבחן",
    },
  },
  courseTabs: {
    label: "חלקי הקורס",
    tasks: "משימות",
  },
  tasks: {
    new: "משימה חדשה",
    edit: "עריכת משימה",
    empty: "אין משימות כאן. הוסיפו את ההגשה הקרובה כדי לא לפספס אותה.",
    created: "המשימה נוספה.",
    saved: "המשימה נשמרה.",
    deleted: "המשימה נמחקה.",
    deleteTitle: "מחיקת משימה",
    deleteConfirm: 'למחוק את "{{title}}"?',
    filterLabel: "סינון לפי סטטוס",
    filterAll: "הכל",
    noDueDate: "ללא מועד",
    weight: "{{weight}}% מהציון",
    fields: {
      title: "כותרת",
      kind: "סוג",
      dueAt: "מועד הגשה",
      weight: "משקל בציון (%)",
      status: "סטטוס",
    },
    kinds: {
      hw: "תרגיל",
      project: "פרויקט",
      exam: "מבחן",
      quiz: "בוחן",
      other: "אחר",
    },
    statuses: {
      todo: "לביצוע",
      doing: "בעבודה",
      done: "הושלם",
    },
  },
  deadline: {
    today: "היום",
    tomorrow: "מחר",
    inDays_one: "בעוד יום",
    inDays_two: "בעוד יומיים",
    inDays_other: "בעוד {{count}} ימים",
    overdue_one: "באיחור של יום",
    overdue_two: "באיחור של יומיים",
    overdue_other: "באיחור של {{count}} ימים",
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

/** Same tree as T with every leaf widened to string. */
type DeepStrings<T> = { [K in keyof T]: T[K] extends string ? string : DeepStrings<T[K]> };

/** Shape every other locale file must match. */
export type Locale = DeepStrings<typeof he>;

export default he;
