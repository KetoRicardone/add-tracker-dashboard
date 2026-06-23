"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Refresca la página cada `intervalSeconds` usando el router de Next.js */
export function AutoRefresh({ intervalSeconds = 30 }: { intervalSeconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
    }, intervalSeconds * 1000);

    return () => clearInterval(id);
  }, [router, intervalSeconds]);

  return null;
}
