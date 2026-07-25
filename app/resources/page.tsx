import type { Metadata } from "next";
import { RESOURCE_REGISTRY } from "@/lib/domain/resources";

export const metadata: Metadata = { title: "Verified resources" };

export default function ResourcesPage() {
  const resources = Object.values(RESOURCE_REGISTRY).filter(
    (resource) => resource.enabled,
  );
  return (
    <main id="main" className="content-page">
      <span className="eyebrow">India reference configuration</span>
      <h1>Verified human support.</h1>
      <p>
        Phone numbers and service descriptions come from a fixed registry. Haven
        Relay never asks Gemini to invent a service.
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
            <a
              href={
                resource.phone ? `tel:${resource.phone}` : resource.sourceUrl
              }
              target={resource.phone ? undefined : "_blank"}
              rel={resource.phone ? undefined : "noreferrer"}
            >
              {resource.phone ? `Call ${resource.phone}` : "Open directory"}
            </a>
          </article>
        ))}
      </div>
    </main>
  );
}
