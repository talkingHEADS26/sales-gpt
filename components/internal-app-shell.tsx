"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { SiteBrand } from "@/components/site-brand";
import { SiteFooter } from "@/components/site-footer";
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
    <main className="min-h-screen bg-white text-[#707070]">
      <header className="site-header">
        <div className="landing-container site-header__inner">
          <SiteBrand href="/dashboard" />

          <nav className="site-nav" aria-label="Hauptnavigation">
            <Link
              href="/dashboard"
              className={`site-nav__link ${isActivePath(pathname, "/dashboard") ? "text-[#0e51a0]" : ""}`}
            >
              Dashboard
            </Link>
            {!isNavLoading && canAccessAdmin ? (
              <Link
                href="/admin"
                className={`site-nav__link ${isActivePath(pathname, "/admin") ? "text-[#0e51a0]" : ""}`}
              >
                Admin
              </Link>
            ) : null}
            {!isNavLoading && canManageOrganization ? (
              <Link
                href="/organization"
                className={`site-nav__link ${isActivePath(pathname, "/organization") ? "text-[#0e51a0]" : ""}`}
              >
                Team verwalten
              </Link>
            ) : null}
          </nav>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isSigningOut}
            className="site-header__cta inline-flex items-center justify-center border border-slate-200 bg-white px-5 text-sm font-medium text-[#707070] shadow-[0_8px_18px_rgba(15,23,42,0.08)] transition hover:border-[#0e51a0]/25 hover:text-[#0e51a0] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSigningOut ? "Logge aus..." : "Logout"}
          </button>

          <details className="mobile-nav">
            <summary className="mobile-nav__toggle" aria-label="Navigation öffnen">
              <span aria-hidden="true" />
              <span aria-hidden="true" />
              <span aria-hidden="true" />
            </summary>
            <nav className="mobile-nav__panel" aria-label="Mobile Hauptnavigation">
              <Link href="/dashboard" className="mobile-nav__link">
                Dashboard
              </Link>
              {!isNavLoading && canAccessAdmin ? (
                <Link href="/admin" className="mobile-nav__link">
                  Admin
                </Link>
              ) : null}
              {!isNavLoading && canManageOrganization ? (
                <Link href="/organization" className="mobile-nav__link">
                  Team verwalten
                </Link>
              ) : null}
              <button
                type="button"
                onClick={handleLogout}
                disabled={isSigningOut}
                className="btn btn-primary mobile-nav__cta"
              >
                {isSigningOut ? "Logge aus...!" : "Logout!"}
              </button>
            </nav>
          </details>
        </div>
      </header>

      <div className={getContainerClassName(containerClassName)}>
        {children}
      </div>

      <SiteFooter />
    </main>
  );
}
