import type { Metadata } from "next";
import { RESOURCE_REGISTRY } from "@/domain/resources";
import { telephoneHref } from "@/features/calls/call-links";

export const metadata: Metadata = { title: "Verified resources" };

export default function ResourcesPage() {
  const resources = Object.values(RESOURCE_REGISTRY).filter(
    (resource) => resource.enabled && resource.phone,
  );
  return (
    <main id="main" tabIndex={-1} className="content-page">
      <span className="eyebrow">Verified India call support</span>
      <h1>Call a real person.</h1>
      <p>
        These support and emergency numbers come from a reviewed registry, not
        generated text. Tapping a call action opens your device dialer; you
        confirm the call.
      </p>
      <div className="resource-list">
        {resources.map((resource) => (
          <article key={resource.id}>
            <div>
              <strong>{resource.name}</strong>
              <p>{resource.serviceScope}</p>
              <small>
                Reviewed {resource.lastVerified} · recheck by{" "}
                {resource.recheckAt}
              </small>
            </div>
            <a href={telephoneHref(resource.phone)}>Call {resource.phone}</a>
          </article>
        ))}
      </div>
    </main>
  );
}
