import { trustedContactInputSchema } from "@/domain/contracts";
import { AccountRepository } from "@/server/account-repository";
import { requireCompletedAccount } from "@/server/auth";
import { privateJson, readBoundedJson, requireSameOrigin } from "@/server/http";

async function repository() {
  const access = await requireCompletedAccount();
  if (access.status !== "ready") {
    return {
      response: privateJson(
        {
          error:
            access.status === "unauthenticated"
              ? "unauthorized"
              : "onboarding_required",
        },
        access.status === "unauthenticated" ? 401 : 403,
      ),
    };
  }
  return {
    value: new AccountRepository(
      access.account.supabase,
      access.account.user.id,
    ),
  };
}

export async function GET() {
  const result = await repository();
  if ("response" in result) return result.response;
  try {
    return privateJson({ contact: await result.value.getContact() });
  } catch {
    return privateJson({ error: "storage_failed" }, 500);
  }
}

export async function PUT(request: Request) {
  if (!requireSameOrigin(request)) {
    return privateJson({ error: "invalid_origin" }, 403);
  }
  const result = await repository();
  if ("response" in result) return result.response;
  try {
    const contact = trustedContactInputSchema.parse(
      await readBoundedJson(request, 2_048),
    );
    const id = await result.value.saveContact(contact);
    return privateJson({ saved: true, id });
  } catch {
    return privateJson({ error: "invalid_contact" }, 400);
  }
}

export async function DELETE(request: Request) {
  if (!requireSameOrigin(request)) {
    return privateJson({ error: "invalid_origin" }, 403);
  }
  const result = await repository();
  if ("response" in result) return result.response;
  try {
    await result.value.deleteContact();
    return privateJson({ deleted: true });
  } catch {
    return privateJson({ error: "storage_failed" }, 500);
  }
}
