export const INDIA_CALL_NUMBERS = {
  emergency: "112",
  substanceUseSupport: "14446",
  mentalHealthSupport: "14416",
} as const;

export function telephoneHref(phone: string): `tel:${string}` {
  if (!/^\+?\d{3,15}$/.test(phone)) {
    throw new Error("invalid_call_number");
  }
  return `tel:${phone}`;
}
