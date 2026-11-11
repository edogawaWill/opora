"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

export default function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleLogout() {
    setIsPending(true);
    setFailed(false);
    try {
      const { error } = await authClient.signOut();
      if (error) {
        setFailed(true);
        return;
      }
      router.replace("/login");
      router.refresh();
    } catch {
      setFailed(true);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={handleLogout}
        disabled={isPending}
        className="rounded-full border border-[#7E2D43] px-5 py-2 text-sm font-semibold text-[#7E2D43] transition hover:bg-[#F9EFF1] disabled:opacity-60"
      >
        {isPending ? "Logging out…" : "Log out"}
      </button>
      {failed && (
        <p className="mt-2 text-sm text-[#7E2D43]" role="alert">
          We could not log you out. Please try again.
        </p>
      )}
    </div>
  );
}
