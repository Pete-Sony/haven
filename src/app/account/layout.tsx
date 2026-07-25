import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { requireUser } from "@/server/auth";

export default async function AccountLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const account = await requireUser();
  if (!account) redirect("/auth?next=/account");
  return children;
}
