import { generateSnowflakeId } from "./snowflake";

export interface ReconcileCandidate {
  visitorInternalId: number;
  visitorPublicId: string;
  matchType: "exact_full_hash" | "cross_browser_hardware_subnet" | "new_visitor";
  confidence: number;
  crossBrowserMatched: boolean;
}

export interface ReconciliationStore {
  findVisitorByExactFullHash(params: {
    siteInternalId: number;
    fullHash: string;
  }): Promise<{ id: number; publicId: string } | null>;

  findVisitorByHardwareAndSubnet(params: {
    siteInternalId: number;
    hardwareHash: string;
    ipSubnet: string;
    sinceDate: Date;
  }): Promise<{ id: number; publicId: string } | null>;

  createOrUpdateVisitor(params: {
    existingVisitorId: number | null;
    newVisitorPublicId: string;
    siteInternalId: number;
    hardwareHash: string;
    dangerLevel: number;
  }): Promise<{ id: number; publicId: string }>;
}

/**
 * 3-Level Visitor Identity Reconciliation Engine:
 * 1. Exact `fullHash` on the same site -> existing visitor, confidence 0.99, crossBrowserMatched: false
 * 2. Exact `hardwareHash` + `ipSubnet` within configurable window (default 30 days) -> existing visitor, confidence 0.88, crossBrowserMatched: true
 * 3. Otherwise -> new `vis_` Snowflake ID, confidence 0.95, crossBrowserMatched: false
 */
export async function reconcileVisitorIdentity(
  store: ReconciliationStore,
  params: {
    siteInternalId: number;
    fullHash: string;
    hardwareHash: string;
    ipSubnet: string;
    dangerLevel: number;
    isSpoofed: boolean;
    windowDays?: number;
  }
): Promise<ReconcileCandidate> {
  const windowDays = Number.isFinite(params.windowDays)
    ? Math.max(1, Math.min(365, Math.floor(params.windowDays!)))
    : 30;
  const sinceDate = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  // Level 1: Exact fullHash match on the same site
  const level1 = await store.findVisitorByExactFullHash({
    siteInternalId: params.siteInternalId,
    fullHash: params.fullHash,
  });

  if (level1) {
    const updated = await store.createOrUpdateVisitor({
      existingVisitorId: level1.id,
      newVisitorPublicId: level1.publicId,
      siteInternalId: params.siteInternalId,
      hardwareHash: params.hardwareHash,
      dangerLevel: params.dangerLevel,
    });
    return {
      visitorInternalId: updated.id,
      visitorPublicId: updated.publicId,
      matchType: "exact_full_hash",
      confidence: params.isSpoofed ? 0.78 : 0.99,
      crossBrowserMatched: false,
    };
  }

  // Level 2: HardwareHash + IP Subnet match within 30-day window (Cross-Browser Reconciliation)
  const level2 = await store.findVisitorByHardwareAndSubnet({
    siteInternalId: params.siteInternalId,
    hardwareHash: params.hardwareHash,
    ipSubnet: params.ipSubnet,
    sinceDate,
  });

  if (level2) {
    const updated = await store.createOrUpdateVisitor({
      existingVisitorId: level2.id,
      newVisitorPublicId: level2.publicId,
      siteInternalId: params.siteInternalId,
      hardwareHash: params.hardwareHash,
      dangerLevel: params.dangerLevel,
    });
    return {
      visitorInternalId: updated.id,
      visitorPublicId: updated.publicId,
      matchType: "cross_browser_hardware_subnet",
      confidence: params.isSpoofed ? 0.72 : 0.88,
      crossBrowserMatched: true,
    };
  }

  // Level 3: Create a new Visitor with a Snowflake `vis_` publicId
  const newPublicId = generateSnowflakeId("vis");
  const created = await store.createOrUpdateVisitor({
    existingVisitorId: null,
    newVisitorPublicId: newPublicId,
    siteInternalId: params.siteInternalId,
    hardwareHash: params.hardwareHash,
    dangerLevel: params.dangerLevel,
  });

  return {
    visitorInternalId: created.id,
    visitorPublicId: created.publicId,
    matchType: "new_visitor",
    confidence: params.isSpoofed ? 0.75 : 0.95,
    crossBrowserMatched: false,
  };
}

