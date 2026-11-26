export interface ThreatScoringInput {
  isBot: boolean;
  isSpoofed: boolean;
  isTor: boolean;
  isVpn: boolean;
  isDatacenter: boolean;
  isProxy: boolean;
  isIncognito: boolean;
  ja4Inconsistent: boolean;
  ipVelocityAnomaly: boolean;
  geoVelocityAnomaly: boolean;
}

export interface ThreatScoringResult {
  dangerLevel: number;
  reasons: string[];
}

/**
 * Calculates a deterministic dangerLevel score on a 0-5 scale combining client anti-spoof probes,
 * network CIDR/ASN intelligence, JA4/User-Agent coherence and Redis velocity anomalies.
 */
export function computeDangerScore(input: ThreatScoringInput): ThreatScoringResult {
  let rawPoints = 0;
  const reasons: string[] = [];

  if (input.isBot) {
    rawPoints += 3;
    reasons.push("bot_automation_detected");
  }

  if (input.isSpoofed) {
    rawPoints += 2;
    reasons.push("client_signal_spoofing_detected");
  }

  if (input.isTor) {
    rawPoints += 3;
    reasons.push("tor_exit_node");
  }

  if (input.ja4Inconsistent) {
    rawPoints += 2;
    reasons.push("ja4_tls_user_agent_mismatch");
  }

  if (input.ipVelocityAnomaly) {
    rawPoints += 2;
    reasons.push("ip_visitor_velocity_exceeded");
  }

  if (input.geoVelocityAnomaly) {
    rawPoints += 2;
    reasons.push("impossible_travel_country_velocity");
  }

  if (input.isVpn || input.isProxy) {
    rawPoints += 1;
    reasons.push("vpn_or_anonymizing_proxy");
  }

  if (input.isDatacenter) {
    rawPoints += 1;
    reasons.push("datacenter_hosting_asn");
  }

  if (input.isIncognito) {
    rawPoints += 1;
    reasons.push("private_incognito_browsing");
  }

  const dangerLevel = Math.max(0, Math.min(5, rawPoints));
  return {
    dangerLevel,
    reasons,
  };
}

