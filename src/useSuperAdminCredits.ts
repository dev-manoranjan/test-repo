"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchWithBrowserSpan } from "@/lib/api-client";

const LOG_PREFIX = "[SuperAdmin]";

type CreditInputState = Record<string, string>;
type CreditBalanceState = Record<string, number | null>;

export function useSuperAdminCredits(installationIds: string[]) {
  const [creditInputs, setCreditInputs] = useState<CreditInputState>({});
  const [creditBalances, setCreditBalances] = useState<CreditBalanceState>({});
  const [grantingInstallationId, setGrantingInstallationId] = useState<
    string | null
  >(null);
  const inFlightGrants = useRef<Set<string>>(new Set());

  const fetchBalance = useCallback(async (installationId: string) => {
    try {
      const res = await fetchWithBrowserSpan(
        `/api/super-admin/credits?installationId=${encodeURIComponent(installationId)}`,
        { credentials: "include" },
      );
      const data = (await res.json()) as { balance?: number | null };
      if (res.ok) {
        setCreditBalances((prev) => ({
          ...prev,
          [installationId]:
            typeof data.balance === "number" ? data.balance : null,
        }));
        return;
      }
      console.warn(`${LOG_PREFIX} Credit balance request failed`, {
        installationId,
        status: res.status,
      });
    } catch (err) {
      console.warn(`${LOG_PREFIX} Failed to fetch credit balance`, {
        installationId,
        error: err,
      });
    }
  }, []);

  useEffect(() => {
    if (installationIds.length === 0) {
      return;
    }
    for (const installationId of installationIds) {
      void fetchBalance(installationId);
    }
  }, [installationIds, fetchBalance]);

  const handleCreditInputChange = useCallback(
    (installationId: string, value: string) => {
      setCreditInputs((prev) => ({ ...prev, [installationId]: value }));
    },
    [],
  );

  const grantCredits = useCallback(
    async (installationId: string, onError: (message: string) => void) => {
      if (inFlightGrants.current.has(installationId)) {
        return;
      }
      inFlightGrants.current.add(installationId);

      const credits = Number.parseInt(creditInputs[installationId] ?? "", 10);
      if (!Number.isFinite(credits) || credits <= 0) {
        onError("Please enter a valid positive number of credits");
        inFlightGrants.current.delete(installationId);
        return;
      }

      setGrantingInstallationId(installationId);

      try {
        const res = await fetchWithBrowserSpan("/api/super-admin/credits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            installationId,
            credits,
            note: "Super admin dashboard grant",
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          throw new Error(data?.error || "Failed to grant credits");
        }
        setCreditInputs((prev) => ({ ...prev, [installationId]: "" }));
        await fetchBalance(installationId);
      } catch (e) {
        console.error(`${LOG_PREFIX} Failed to grant credits`, {
          installationId,
          error: e,
        });
        onError(e instanceof Error ? e.message : "Failed to grant credits");
      } finally {
        setGrantingInstallationId(null);
        inFlightGrants.current.delete(installationId);
      }
    },
    [creditInputs, fetchBalance],
  );

  return {
    creditInputs,
    creditBalances,
    grantingInstallationId,
    handleCreditInputChange,
    grantCredits,
  };
}
