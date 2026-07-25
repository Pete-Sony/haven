const MEDICAL_OR_UNSUPPORTED_PATTERN =
  /\b(?:diagnos(?:e|is|ed|tic)|medicat(?:e|ion)|dos(?:e|age)|taper(?:ing)?|detox(?:ification)?|withdrawal protocol|clinically proven|you are safe|guarantee(?:d)?|help is (?:on the way|coming)|message (?:was|has been) sent|call (?:was|has been) placed)\b/i;
const URL_PATTERN = /\b(?:https?:\/\/|www\.)\S*/i;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_PATTERN = /(?:^|[^\w])(?:\+?\d[\d ().-]{6,}\d)(?:$|[^\w])/;
const COERCIVE_PATTERN =
  /\b(?:you must|you have to|do as i say|force (?:them|the person)|make (?:them|the person) comply)\b/i;
const DIGIT_PATTERN = /\d/;
const URL_PATTERN_GLOBAL = /\b(?:https?:\/\/|www\.)\S*/gi;
const EMAIL_PATTERN_GLOBAL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN_GLOBAL = /(?:^|[^\w])(?:\+?\d[\d ().-]{6,}\d)(?=$|[^\w])/g;
const TIMESTAMP_PATTERN_GLOBAL =
  /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})\b/gi;
const LABELED_PRIVATE_DETAIL_GLOBAL =
  /\b(?:my name is|their name is|contact is|safe place is|location is|address is)\s+[^.!?\n]{1,100}/gi;

export type GeneratedTextRejection =
  | "prohibited_language"
  | "coercive_language"
  | "url_not_allowed"
  | "email_not_allowed"
  | "phone_not_allowed"
  | "numeric_detail_not_allowed";

/** Shared last-line defense for any model-generated text shown to a user. */
export function rejectGeneratedText(
  text: string,
): GeneratedTextRejection | null {
  if (MEDICAL_OR_UNSUPPORTED_PATTERN.test(text)) {
    return "prohibited_language";
  }
  if (COERCIVE_PATTERN.test(text)) return "coercive_language";
  if (URL_PATTERN.test(text)) return "url_not_allowed";
  if (EMAIL_PATTERN.test(text)) return "email_not_allowed";
  if (PHONE_PATTERN.test(text)) return "phone_not_allowed";
  if (DIGIT_PATTERN.test(text)) return "numeric_detail_not_allowed";
  return null;
}

export function rejectGeneratedTexts(
  texts: readonly string[],
): GeneratedTextRejection | null {
  for (const text of texts) {
    const reason = rejectGeneratedText(text);
    if (reason) return reason;
  }
  return null;
}

/** Removes contact/location-shaped details before free text enters a model. */
export function redactSensitiveText(text: string): string {
  return text
    .replace(URL_PATTERN_GLOBAL, "[redacted-url]")
    .replace(EMAIL_PATTERN_GLOBAL, "[redacted-email]")
    .replace(PHONE_PATTERN_GLOBAL, " [redacted-phone]")
    .replace(TIMESTAMP_PATTERN_GLOBAL, "[redacted-time]")
    .replace(LABELED_PRIVATE_DETAIL_GLOBAL, "[redacted-private-detail]");
}
