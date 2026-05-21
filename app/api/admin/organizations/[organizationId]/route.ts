import { NextResponse } from "next/server";

import { isAdminAuthFailure, requireMasterAdmin } from "@/lib/admin-server";
import {
  FRANCHISE_VERTICAL_KEYS,
  normalizeFranchiseVerticalKey,
  INDUSTRY_KEYS,
  normalizeIndustryKey,
} from "@/lib/industries";

type OrganizationRecord = {
  franchise_vertical: string | null;
  id: string;
  industry_key: string | null;
  industry_locked: boolean | null;
  prompt_profile_key: string | null;
};

type PatchRequestBody = {
  franchiseVertical?: string | null;
  industryKey?: string;
  industryLocked?: boolean;
  promptProfileKey?: string | null;
};

function toLegacyIndustryKey(industryKey: string) {
  if (industryKey === "franchise") {
    return "automotive";
  }
  if (industryKey === "finance") {
    return "insurance";
  }
  if (industryKey === "fitness") {
    return "physio";
  }
  return industryKey;
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ organizationId: string }> }
) {
  try {
    const adminAuth = await requireMasterAdmin(
      request.headers.get("authorization")
    );

    if (isAdminAuthFailure(adminAuth)) {
      return NextResponse.json(
        { error: adminAuth.error },
        { status: adminAuth.status }
      );
    }

    const { organizationId } = await context.params;

    const { data: organization, error: organizationError } =
      await adminAuth.serviceRoleClient
        .from("organizations")
        .select("id")
        .eq("id", organizationId)
        .maybeSingle<OrganizationRecord>();

    if (organizationError) {
      return NextResponse.json(
        { error: organizationError.message },
        { status: 500 }
      );
    }

    if (!organization) {
      return NextResponse.json(
        { error: "Organisation nicht gefunden." },
        { status: 404 }
      );
    }

    const { error: deleteError } = await adminAuth.serviceRoleClient
      .from("organizations")
      .delete()
      .eq("id", organizationId);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      organizationId,
      success: true,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Organisation konnte nicht gelöscht werden.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ organizationId: string }> }
) {
  try {
    const adminAuth = await requireMasterAdmin(
      request.headers.get("authorization")
    );

    if (isAdminAuthFailure(adminAuth)) {
      return NextResponse.json(
        { error: adminAuth.error },
        { status: adminAuth.status }
      );
    }

    const { organizationId } = await context.params;
    const { franchiseVertical, industryKey, industryLocked, promptProfileKey } =
      (await request.json()) as PatchRequestBody;

    let organization: OrganizationRecord | null = null;
    const organizationQueryWithVertical = await adminAuth.serviceRoleClient
      .from("organizations")
      .select("id, industry_key, prompt_profile_key, industry_locked, franchise_vertical")
      .eq("id", organizationId)
      .maybeSingle<OrganizationRecord>();
    let organizationError = organizationQueryWithVertical.error;
    organization = organizationQueryWithVertical.data;

    if (organizationError?.message?.includes("franchise_vertical")) {
      const fallbackQuery = await adminAuth.serviceRoleClient
        .from("organizations")
        .select("id, industry_key, prompt_profile_key, industry_locked")
        .eq("id", organizationId)
        .maybeSingle<{
          id: string;
          industry_key: string | null;
          industry_locked: boolean | null;
          prompt_profile_key: string | null;
        }>();
      organizationError = fallbackQuery.error;
      organization = fallbackQuery.data
        ? {
            ...fallbackQuery.data,
            franchise_vertical: null,
          }
        : null;
    }

    if (organizationError) {
      return NextResponse.json(
        { error: organizationError.message },
        { status: 500 }
      );
    }

    if (!organization) {
      return NextResponse.json(
        { error: "Organisation nicht gefunden." },
        { status: 404 }
      );
    }

    const normalizedPromptProfileKey = promptProfileKey?.trim() || null;

    if (
      typeof industryKey === "string" &&
      !(INDUSTRY_KEYS as readonly string[]).includes(industryKey)
    ) {
      return NextResponse.json(
        { error: "industryKey ist ungueltig." },
        { status: 400 }
      );
    }

    const nextIndustryKey =
      typeof industryKey === "string"
        ? normalizeIndustryKey(industryKey)
        : normalizeIndustryKey(organization.industry_key);
    const normalizedFranchiseVertical =
      typeof franchiseVertical === "string"
        ? normalizeFranchiseVerticalKey(franchiseVertical)
        : null;

    const updatePayload: {
      franchise_vertical?: string | null;
      industry_key?: string;
      industry_locked?: boolean;
      prompt_profile_key?: string | null;
    } = {};
    const isFranchiseIndustrySwitch =
      typeof industryKey === "string" && nextIndustryKey === "franchise";

    if (typeof industryKey === "string") {
      updatePayload.industry_key = nextIndustryKey;
      if (nextIndustryKey !== "franchise") {
        updatePayload.franchise_vertical = null;
      }
    }

    if (typeof industryLocked === "boolean") {
      updatePayload.industry_locked = industryLocked;
    }

    if (promptProfileKey !== undefined) {
      updatePayload.prompt_profile_key = normalizedPromptProfileKey;
    }

    if (
      franchiseVertical !== undefined &&
      !(franchiseVertical === null || (FRANCHISE_VERTICAL_KEYS as readonly string[]).includes(franchiseVertical))
    ) {
      return NextResponse.json(
        { error: "franchiseVertical ist ungueltig." },
        { status: 400 }
      );
    }

    if (franchiseVertical !== undefined) {
      updatePayload.franchise_vertical =
        nextIndustryKey === "franchise"
          ? normalizedFranchiseVertical ?? normalizeFranchiseVerticalKey(organization.franchise_vertical)
          : null;
    }

    // For explicit switch to franchise from admin, mimic a minimal signup-style write path:
    // only persist industry_key and franchise_vertical.
    if (isFranchiseIndustrySwitch) {
      const nextFranchiseVertical =
        normalizedFranchiseVertical ??
        normalizeFranchiseVerticalKey(organization.franchise_vertical);
      updatePayload.industry_key = "franchise";
      updatePayload.franchise_vertical = nextFranchiseVertical;
      delete updatePayload.industry_locked;
      delete updatePayload.prompt_profile_key;
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({
        franchiseVertical:
          nextIndustryKey === "franchise"
            ? normalizeFranchiseVerticalKey(organization.franchise_vertical)
            : null,
        industryKey: normalizeIndustryKey(organization.industry_key),
        industryLocked: organization.industry_locked ?? true,
        organizationId,
        promptProfileKey: organization.prompt_profile_key ?? null,
        success: true,
      });
    }

    let updatedOrganization: OrganizationRecord | null = null;
    let updateError: { message: string } | null = null;
    let payloadUsedForLastUpdate = { ...updatePayload };

    const updateResultWithVertical = await adminAuth.serviceRoleClient
      .from("organizations")
      .update(payloadUsedForLastUpdate)
      .eq("id", organizationId)
      .select("id, industry_key, prompt_profile_key, industry_locked, franchise_vertical")
      .single<OrganizationRecord>();

    updateError = updateResultWithVertical.error;
    updatedOrganization = updateResultWithVertical.data;

    if (updateError?.message?.includes("franchise_vertical")) {
      const { franchise_vertical: _ignored, ...fallbackPayload } = updatePayload;
      payloadUsedForLastUpdate = fallbackPayload;
      const updateFallbackResult = await adminAuth.serviceRoleClient
        .from("organizations")
        .update(payloadUsedForLastUpdate)
        .eq("id", organizationId)
        .select("id, industry_key, prompt_profile_key, industry_locked")
        .single<{
          id: string;
          industry_key: string | null;
          industry_locked: boolean | null;
          prompt_profile_key: string | null;
        }>();

      updateError = updateFallbackResult.error;
      updatedOrganization = updateFallbackResult.data
        ? {
            ...updateFallbackResult.data,
            franchise_vertical: null,
          }
        : null;
    }

    if (
      updateError?.message?.includes("organizations_industry_key_check") &&
      typeof updatePayload.industry_key === "string"
    ) {
      const legacyIndustryKey = toLegacyIndustryKey(updatePayload.industry_key);

      if (legacyIndustryKey !== updatePayload.industry_key) {
        const legacyPayload = {
          ...payloadUsedForLastUpdate,
          industry_key: legacyIndustryKey,
        };

        const legacyUpdateResult = await adminAuth.serviceRoleClient
          .from("organizations")
          .update(legacyPayload)
          .eq("id", organizationId)
          .select("id, industry_key, prompt_profile_key, industry_locked, franchise_vertical")
          .single<OrganizationRecord>();

        updateError = legacyUpdateResult.error;
        updatedOrganization = legacyUpdateResult.data;
      }
    }

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    if (!updatedOrganization) {
      return NextResponse.json(
        { error: "Organisation konnte nicht aktualisiert werden." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      franchiseVertical:
        normalizeIndustryKey(updatedOrganization.industry_key) === "franchise"
          ? normalizeFranchiseVerticalKey(updatedOrganization.franchise_vertical)
          : null,
      industryKey: normalizeIndustryKey(updatedOrganization.industry_key),
      industryLocked: updatedOrganization.industry_locked ?? true,
      organizationId,
      promptProfileKey: updatedOrganization.prompt_profile_key ?? null,
      success: true,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Organisation konnte nicht aktualisiert werden.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
