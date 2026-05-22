"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { SiteBrand } from "@/components/site-brand";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase";

type InternalAppShellProps = {
  children: ReactNode;
  containerClassName?: string;
};

type OrganizationMembership = {
  organizations: {
    id: string;
  } | null;
  role_in_org: string;
};

type ProfileRecord = {
  role: string | null;
};

type SubscriptionRecord = {
  plan_key: string | null;
};

function isTeamPlanKey(planKey: string | null | undefined) {
  return planKey === "team_3" || planKey === "team_5" || planKey === "enterprise";
}

const defaultContainerClassName =
  "mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8";

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function getContainerClassName(containerClassName?: string) {
  return containerClassName ?? defaultContainerClassName;
}

export function InternalAppShell({
  children,
  containerClassName,
}: InternalAppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [canAccessAdmin, setCanAccessAdmin] = useState(false);
  const [canManageOrganization, setCanManageOrganization] = useState(false);
  const [isNavLoading, setIsNavLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadNavigationState = async () => {
      if (!hasSupabaseEnv) {
        if (isActive) {
          setCanManageOrganization(false);
          setIsNavLoading(false);
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
          data: { user: authUser },
        } = await supabase.auth.getUser();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const user = authUser ?? session?.user ?? null;

        if (!user) {
          if (isActive) {
            setCanAccessAdmin(false);
            setCanManageOrganization(false);
            setIsNavLoading(false);
          }
          return;
        }

        const [
          { data: membership, error: membershipError },
          { data: profile, error: profileError },
        ] = await Promise.all([
          supabase
            .from("organization_members")
            .select("role_in_org, organizations(id)")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle<OrganizationMembership>(),
          supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle<ProfileRecord>(),
        ]);

        if (profileError) {
          throw profileError;
        }

        if (membershipError) {
          throw membershipError;
        }

        let hasTeamPlanAccess = false;
        const organizationId = membership?.organizations?.id ?? null;

        if (organizationId) {
          const { data: latestSubscription, error: subscriptionError } =
            await supabase
              .from("subscriptions")
              .select("plan_key")
              .eq("organization_id", organizationId)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle<SubscriptionRecord>();

          if (subscriptionError) {
            throw subscriptionError;
          }

          hasTeamPlanAccess = isTeamPlanKey(latestSubscription?.plan_key ?? null);
        }

        if (isActive) {
          const hasMasterAdminAccess = profile?.role === "master_admin";
          const hasOrganizationAdminRole = membership?.role_in_org === "admin";

          setCanAccessAdmin(hasMasterAdminAccess);
          setCanManageOrganization(
            hasMasterAdminAccess || (hasOrganizationAdminRole && hasTeamPlanAccess)
          );
          setIsNavLoading(false);
        }
      } catch {
        if (isActive) {
          setCanAccessAdmin(false);
          setCanManageOrganization(false);
          setIsNavLoading(false);
        }
      }
    };

    void loadNavigationState();

    const supabase = getSupabaseBrowserClient();
    const authListener = supabase?.auth.onAuthStateChange(() => {
      void loadNavigationState();
    });

    return () => {
      isActive = false;
      authListener?.data.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    if (!hasSupabaseEnv) {
      router.push("/login");
      return;
    }

    try {
      setIsSigningOut(true);

      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        throw new Error(
          "Supabase konnte nicht initialisiert werden. Prüfe die Konfiguration."
        );
      }

      await supabase.auth.signOut();
    } finally {
      router.push("/login");
      router.refresh();
      setIsSigningOut(false);
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f7fbff_0%,#ffffff_45%,#f4f9ff_100%)] text-[#707070]">
      <div className="relative isolate min-h-screen">
        <div className="absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[linear-gradient(135deg,rgba(14,81,160,0.18),rgba(14,81,160,0.03)_46%,rgba(255,255,255,0)_72%)]" />
        <div className="absolute left-1/2 top-24 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-[#0e51a0]/12 blur-3xl" />

        <div className={getContainerClassName(containerClassName)}>
          <header className="flex flex-col gap-4 rounded-[1.5rem] border border-[#dbe7f8] bg-white px-4 py-4 shadow-[0_12px_30px_rgba(14,81,160,0.10)] sm:px-5 lg:flex-row lg:items-center lg:justify-between lg:px-6">
            <div className="flex items-center justify-between gap-4">
              <SiteBrand href="/dashboard" />
              <button
                type="button"
                onClick={handleLogout}
                disabled={isSigningOut}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white/90 px-4 text-sm font-medium text-[#707070] shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition hover:border-[#0e51a0]/30 hover:text-[#0e51a0] disabled:cursor-not-allowed disabled:opacity-60 lg:hidden"
              >
                {isSigningOut ? "Logge aus..." : "Logout"}
              </button>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:flex-1 lg:justify-end">
              <nav className="flex flex-wrap gap-2">
                <Link
                  href="/dashboard"
                  className={`inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-medium transition ${
                    isActivePath(pathname, "/dashboard")
                      ? "bg-[#0e51a0] text-white shadow-[0_16px_36px_rgba(14,81,160,0.22)]"
                      : "border border-slate-200 bg-white/90 text-[#707070] shadow-[0_12px_30px_rgba(15,23,42,0.06)] hover:border-[#0e51a0]/30 hover:text-[#0e51a0]"
                  }`}
                >
                  Dashboard
                </Link>
                {!isNavLoading && canAccessAdmin ? (
                  <Link
                    href="/admin"
                    className={`inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-medium transition ${
                      isActivePath(pathname, "/admin")
                        ? "bg-[#0e51a0] text-white shadow-[0_16px_36px_rgba(14,81,160,0.22)]"
                        : "border border-slate-200 bg-white/90 text-[#707070] shadow-[0_12px_30px_rgba(15,23,42,0.06)] hover:border-[#0e51a0]/30 hover:text-[#0e51a0]"
                    }`}
                  >
                    Admin
                  </Link>
                ) : null}
                {!isNavLoading && canManageOrganization ? (
                  <Link
                    href="/organization"
                    className={`inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-medium transition ${
                      isActivePath(pathname, "/organization")
                        ? "bg-[#0e51a0] text-white shadow-[0_16px_36px_rgba(14,81,160,0.22)]"
                        : "border border-slate-200 bg-white/90 text-[#707070] shadow-[0_12px_30px_rgba(15,23,42,0.06)] hover:border-[#0e51a0]/30 hover:text-[#0e51a0]"
                    }`}
                  >
                    Team verwalten
                  </Link>
                ) : null}
              </nav>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isSigningOut}
                className="hidden min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white/90 px-5 text-sm font-medium text-[#707070] shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition hover:border-[#0e51a0]/30 hover:text-[#0e51a0] disabled:cursor-not-allowed disabled:opacity-60 lg:inline-flex"
              >
                {isSigningOut ? "Logge aus..." : "Logout"}
              </button>
            </div>
          </header>

          {children}
        </div>
      </div>
    </main>
  );
}
