import { AccountRepository } from "@/server/account-repository";
import { requireUser } from "@/server/auth";
import { privateJson } from "@/server/http";

export async function GET() {
  const account = await requireUser();
  if (!account) return privateJson({ error: "unauthorized" }, 401);
  try {
    const repository = new AccountRepository(account.supabase, account.user.id);
    const data = await repository.exportData(account.user.email);
    const response = new Response(JSON.stringify(data, null, 2), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition":
          'attachment; filename="haven-account-export.json"',
        "Content-Type": "application/json; charset=utf-8",
        Pragma: "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
    return response;
  } catch {
    return privateJson({ error: "export_failed" }, 500);
  }
}
