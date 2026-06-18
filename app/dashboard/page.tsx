"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { InternalAppShell } from "@/components/internal-app-shell";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase";
import { StartSessionActions } from "./start-session-actions";

type Profile = {
  first_name: string | null;
  full_name: string | null;
};

type OrganizationMembership = {
  organizations: {
    organization_name: string | null;
  } | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const loadDashboard = async () => {
      if (!hasSupabaseEnv) {
        if (isActive) {
          setError(
            "Supabase ist noch nicht vollständig konfiguriert. Prüfe deine Umgebungsvariablen."
          );
          setIsLoading(false);
        }
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();

        if (!supabase) {
          throw new Error(
            "Supabase konnte nicht initialisiert werden. Prüfe die Konfiguration."
          );
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          router.replace("/login");
          return;
        }

        const {
          data: { session: authSession },
        } = await supabase.auth.getSession();

        const accessToken = authSession?.access_token;

        if (accessToken) {
          const accessResponse = await fetch("/api/auth/access-status", {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
          const accessBody = (await accessResponse.json()) as { error?: string };

          if (accessResponse.status === 401) {
            router.replace("/login");
            return;
          }

          if (accessResponse.status === 403) {
            await supabase.auth.signOut();
            router.replace(
              `/login?error=${encodeURIComponent(
                accessBody.error ?? "Dein Zugang ist aktuell nicht aktiv."
              )}`
            );
            return;
          }
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("first_name, full_name")
          .eq("id", user.id)
          .maybeSingle<Profile>();

        if (profileError) {
          throw profileError;
        }

        const { data: membership, error: membershipError } = await supabase
          .from("organization_members")
          .select("organizations!inner(organization_name)")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle<OrganizationMembership>();

        if (membershipError) {
          throw membershipError;
        }

        const resolvedDisplayName =
          profile?.first_name?.trim() ||
          profile?.full_name?.trim() ||
          null;

        if (isActive) {
          setUserId(user.id);
          setDisplayName(resolvedDisplayName);
          setOrganizationName(
            membership?.organizations?.organization_name?.trim() || null
          );
          setError("");
          setIsLoading(false);
        }
      } catch (err) {
        if (isActive) {
          const message =
            err instanceof Error
              ? err.message
              : "Das Dashboard konnte nicht geladen werden.";

          setError(message);
          setIsLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      isActive = false;
    };
  }, [router]);

  return (
    <InternalAppShell>
      <div>
        <section className="py-8 sm:py-10 lg:py-12">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:p-6 lg:p-8">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#0e51a0]">
                talkingHEADS Sales Trainer Dashboard
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#0E51A0] sm:text-4xl">
                {displayName ? `Willkommen zurück, ${displayName}` : "Willkommen zurück"}
              </h1>
              {organizationName ? (
                <p className="mt-3 text-sm font-medium uppercase tracking-[0.08em] text-[#707070]">
                  {organizationName}
                </p>
              ) : null}
              <p className="mt-4 max-w-2xl text-base leading-7 text-[#707070] sm:text-lg sm:leading-8">
                Starte direkt in dein nächstes Sales-Training und arbeite fokussiert an besseren Gesprächen, klarerer Wirkung und stärkeren Abschlüssen.
              </p>
            </div>

            {isLoading ? (
              <p className="mt-8 text-base leading-7 text-[#707070]">
                Dashboard wird geladen...
              </p>
            ) : null}

            {!isLoading && error ? (
              <p className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            {!isLoading && !error ? <StartSessionActions userId={userId} /> : null}
          </div>
        </section>
      </div>
    </InternalAppShell>
  );
}
