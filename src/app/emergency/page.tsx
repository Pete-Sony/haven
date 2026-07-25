import type { Metadata } from "next";
import { Phone } from "lucide-react";

export const metadata: Metadata = { title: "Emergency help" };

export default function EmergencyPage() {
  return (
    <main id="main" tabIndex={-1} className="emergency-page">
      <span className="eyebrow">Immediate help in India</span>
      <h1>Call 112 now.</h1>
      <p>
        If someone is not responding, not breathing normally, having a seizure,
        has collapsed, or is in immediate danger, do not wait for GenAI or this
        app.
      </p>
      <a className="call-button" href="tel:112">
        <Phone /> Call 112
      </a>
      <small>
        The call starts only after you tap and confirm on your device.
      </small>
      <section className="emergency-script">
        <span>Words for the dispatcher</span>
        <blockquote>
          “A person is showing signs that may be an emergency. Our location is
          [say your location]. Please send emergency assistance. I will follow
          the dispatcher&apos;s instructions.”
        </blockquote>
      </section>
    </main>
  );
}
