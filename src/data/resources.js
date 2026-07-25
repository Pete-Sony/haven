export const VERIFIED_ON = "25 July 2026";

export const resources = {
  emergency: {
    id: "in.erss.112",
    name: "Emergency Response Support System",
    shortName: "Emergency help",
    phone: "112",
    description:
      "India's single emergency number for police, fire and rescue, health, and other emergency services.",
    source: "ERSS — Government of India",
    sourceUrl: "https://112.gov.in/about",
    verified: VERIFIED_ON,
  },
  substanceSupport: {
    id: "in.nmba.14446",
    name: "Nasha Mukt Bharat Abhiyaan",
    shortName: "Drug de-addiction helpline",
    phone: "14446",
    description:
      "National toll-free counselling, information, and referral support for substance use.",
    source: "Ministry of Social Justice & Empowerment",
    sourceUrl: "https://nmba.dosje.gov.in/index.php/toll-free",
    verified: VERIFIED_ON,
  },
  mentalHealth: {
    id: "in.telemanas.14416",
    name: "Tele-MANAS",
    shortName: "Mental health support",
    phone: "14416",
    alternatePhone: "1800-89-14416",
    description:
      "National 24×7 tele-mental-health access across Indian states and union territories.",
    source: "Directorate General of Health Services",
    sourceUrl: "https://dghs.mohfw.gov.in/national-mental-health-programme.php",
    verified: VERIFIED_ON,
  },
};

export const sourceLessons = {
  cravingWave: {
    id: "haven.craving-wave.v1",
    eyebrow: "A 60-second idea",
    title: "Make the next minute smaller",
    body:
      "A craving can feel like an instruction, but it is an experience that changes over time. Moving away from the cue and contacting a trusted person can make space for the next decision.",
    source: "NIDA — Treatment and Recovery",
    sourceUrl: "https://nida.nih.gov/publications/drugs-brains-behavior-science-addiction/treatment-recovery",
  },
  caregiverPresence: {
    id: "haven.caregiver-presence.v1",
    eyebrow: "For supporters",
    title: "Lead with one calm choice",
    body:
      "Use observable facts, keep your voice steady, and offer one small choice. You do not need to diagnose or solve everything in the moment.",
    source: "WHO — Helping someone with drug use",
    sourceUrl: "https://www.who.int/health-topics/drugs-psychoactive",
  },
};
