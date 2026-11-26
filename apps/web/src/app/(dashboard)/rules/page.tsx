"use client";

import * as React from "react";
import { Play, Plus, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import type { SecurityRuleAction } from "@bloumeid/sdk";
import {
  evaluateSecurityRules,
  type RuleConditionField,
  type RuleConditionOperator,
} from "@/lib/engine/rules";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyableMono } from "@/components/ui/copyable-mono";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { PublicSecurityRuleDTO } from "@/types";

export default function SecurityRulesPage() {
  const { dict, selectedSiteId } = useI18n();
  const [rules, setRules] = React.useState<PublicSecurityRuleDTO[]>([]);
  const [name, setName] = React.useState("");
  const [action, setAction] = React.useState<SecurityRuleAction>("block");
  const [field, setField] = React.useState<RuleConditionField>("isTor");
  const [operator, setOperator] = React.useState<RuleConditionOperator>("eq");
  const [valueStr, setValueStr] = React.useState("true");
  const [priority, setPriority] = React.useState(25);

  // Live Rule Simulator Sandbox State
  const [simDanger, setSimDanger] = React.useState(4);
  const [simCountry, setSimCountry] = React.useState("DE");
  const [simAsn, setSimAsn] = React.useState(24940);
  const [simIsTor, setSimIsTor] = React.useState(true);
  const [simIsVpn, setSimIsVpn] = React.useState(false);
  const [simIsBot, setSimIsBot] = React.useState(false);
  const [simIsSpoofed, setSimIsSpoofed] = React.useState(false);
  const [simIsDatacenter, setSimIsDatacenter] = React.useState(true);

  const loadRules = React.useCallback(async () => {
    const res = await fetch(`/api/admin/rules?siteId=${encodeURIComponent(selectedSiteId)}`);
    if (res.ok) {
      const data = (await res.json()) as { rules: PublicSecurityRuleDTO[] };
      setRules(data.rules);
    }
  }, [selectedSiteId]);

  React.useEffect(() => {
    void loadRules();
  }, [loadRules]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedVal: string | number | boolean =
      valueStr === "true"
        ? true
        : valueStr === "false"
          ? false
          : Number.isFinite(Number(valueStr)) && valueStr.trim() !== ""
            ? Number(valueStr)
            : valueStr;

    const res = await fetch("/api/admin/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sitePublicId: selectedSiteId === "all" ? null : selectedSiteId,
        name,
        action,
        priority,
        conditions: [{ field, operator, value: parsedVal }],
      }),
    });

    if (res.ok) {
      setName("");
      await loadRules();
    }
  };

  const applyTemplate = async (tpl: {
    name: string;
    action: SecurityRuleAction;
    priority: number;
    field: RuleConditionField;
    operator: RuleConditionOperator;
    value: string | number | boolean;
  }) => {
    const res = await fetch("/api/admin/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sitePublicId: selectedSiteId === "all" ? null : selectedSiteId,
        name: tpl.name,
        action: tpl.action,
        priority: tpl.priority,
        conditions: [{ field: tpl.field, operator: tpl.operator, value: tpl.value }],
      }),
    });
    if (res.ok) {
      await loadRules();
    }
  };

  const handleToggle = async (publicId: string, isEnabled: boolean) => {
    const res = await fetch("/api/admin/rules", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicId, isEnabled }),
    });
    if (res.ok) {
      setRules((prev) => prev.map((r) => (r.publicId === publicId ? { ...r, isEnabled } : r)));
    }
  };

  const handleDelete = async (publicId: string) => {
    const res = await fetch(`/api/admin/rules?publicId=${encodeURIComponent(publicId)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setRules((prev) => prev.filter((r) => r.publicId !== publicId));
    }
  };

  // Real-time evaluation of the sandbox parameters against active rules
  const simulatedOutcome = React.useMemo(() => {
    return evaluateSecurityRules(rules, {
      sitePublicId: selectedSiteId === "all" ? "site_73000000000000001" : selectedSiteId,
      visitorPublicId: "vis_sandbox_test",
      dangerLevel: simDanger,
      country: simCountry,
      asnNumber: simAsn,
      ipSubnet: "185.220.101.0/24",
      isTor: simIsTor,
      isVpn: simIsVpn,
      isBot: simIsBot,
      isSpoofed: simIsSpoofed,
      isDatacenter: simIsDatacenter,
    });
  }, [
    rules,
    selectedSiteId,
    simDanger,
    simCountry,
    simAsn,
    simIsTor,
    simIsVpn,
    simIsBot,
    simIsSpoofed,
    simIsDatacenter,
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{dict.rules.title}</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">{dict.rules.subtitle}</p>
      </div>

      {/* 1-Click Enterprise Policy Templates */}
      <Card className="border-primary/25 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">{dict.rules.templatesTitle}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              applyTemplate({
                name: dict.rules.tplTorBlock,
                action: "block",
                priority: 5,
                field: "isTor",
                operator: "eq",
                value: true,
              })
            }
          >
            <Plus className="h-3.5 w-3.5 text-rose-500" />
            <span>{dict.rules.tplTorBlock}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              applyTemplate({
                name: dict.rules.tplBotChallenge,
                action: "challenge",
                priority: 10,
                field: "isBot",
                operator: "eq",
                value: true,
              })
            }
          >
            <Plus className="h-3.5 w-3.5 text-amber-500" />
            <span>{dict.rules.tplBotChallenge}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              applyTemplate({
                name: dict.rules.tplSpoofBlock,
                action: "block",
                priority: 15,
                field: "isSpoofed",
                operator: "eq",
                value: true,
              })
            }
          >
            <Plus className="h-3.5 w-3.5 text-rose-500" />
            <span>{dict.rules.tplSpoofBlock}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              applyTemplate({
                name: dict.rules.tplDatacenterFlag,
                action: "flag",
                priority: 30,
                field: "isDatacenter",
                operator: "eq",
                value: true,
              })
            }
          >
            <Plus className="h-3.5 w-3.5 text-sky-500" />
            <span>{dict.rules.tplDatacenterFlag}</span>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Create Custom Rule Form */}
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle className="text-base">{dict.rules.createRule}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="rule-name">{dict.rules.ruleName}</Label>
                <Input
                  id="rule-name"
                  data-testid="new-rule-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={dict.rules.ruleNamePlaceholder}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rule-field">{dict.rules.conditionField}</Label>
                <select
                  id="rule-field"
                  value={field}
                  onChange={(e) => setField(e.target.value as RuleConditionField)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-medium"
                >
                  <option value="isTor">isTor</option>
                  <option value="isVpn">isVpn</option>
                  <option value="isDatacenter">isDatacenter</option>
                  <option value="isBot">isBot</option>
                  <option value="isSpoofed">isSpoofed</option>
                  <option value="dangerLevel">dangerLevel</option>
                  <option value="country">country (ISO)</option>
                  <option value="asnNumber">asnNumber</option>
                  <option value="ipSubnet">ipSubnet</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rule-op">{dict.rules.conditionOperator}</Label>
                <select
                  id="rule-op"
                  value={operator}
                  onChange={(e) => setOperator(e.target.value as RuleConditionOperator)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-medium"
                >
                  <option value="eq">eq (=)</option>
                  <option value="neq">neq (!=)</option>
                  <option value="gte">gte (&gt;=)</option>
                  <option value="in">in (list)</option>
                  <option value="not_in">not_in</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rule-val">{dict.rules.conditionValue}</Label>
                <Input
                  id="rule-val"
                  value={valueStr}
                  onChange={(e) => setValueStr(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rule-priority">{dict.rules.priority}</Label>
                <Input
                  id="rule-priority"
                  type="number"
                  min={1}
                  max={1000}
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                />
              </div>

              <div className="flex items-end gap-2 sm:col-span-2">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="rule-action">{dict.rules.ruleAction}</Label>
                  <select
                    id="rule-action"
                    value={action}
                    onChange={(e) => setAction(e.target.value as SecurityRuleAction)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-semibold"
                  >
                    <option value="block">{dict.rules.actionBlock}</option>
                    <option value="challenge">{dict.rules.actionChallenge}</option>
                    <option value="flag">{dict.rules.actionFlag}</option>
                    <option value="allow">{dict.rules.actionAllow}</option>
                  </select>
                </div>
                <Button type="submit" data-testid="create-rule-btn">
                  <Plus className="h-4 w-4" />
                  <span>{dict.common.create}</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Interactive Live Rule Simulator Sandbox */}
        <Card className="border-border bg-card lg:col-span-5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4 text-emerald-500" />
              <CardTitle className="text-base">{dict.rules.sandboxTitle}</CardTitle>
            </div>
            <CardDescription className="text-xs">{dict.rules.sandboxSubtitle}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2.5">
              <div className="space-y-1">
                <Label htmlFor="sim-danger" className="text-xs">
                  Danger (0-5)
                </Label>
                <Input
                  id="sim-danger"
                  type="number"
                  min={0}
                  max={5}
                  value={simDanger}
                  onChange={(e) => setSimDanger(Number(e.target.value))}
                  className="h-8 font-mono text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sim-country" className="text-xs">
                  ISO Country
                </Label>
                <Input
                  id="sim-country"
                  value={simCountry}
                  onChange={(e) => setSimCountry(e.target.value.toUpperCase())}
                  className="h-8 font-mono text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sim-asn" className="text-xs">
                  ASN
                </Label>
                <Input
                  id="sim-asn"
                  type="number"
                  value={simAsn}
                  onChange={(e) => setSimAsn(Number(e.target.value))}
                  className="h-8 font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["isTor", simIsTor, setSimIsTor, dict.flags.tor],
                  ["isVpn", simIsVpn, setSimIsVpn, dict.flags.vpn],
                  ["isBot", simIsBot, setSimIsBot, dict.flags.bot],
                  ["isSpoofed", simIsSpoofed, setSimIsSpoofed, dict.flags.spoofed],
                  ["isDatacenter", simIsDatacenter, setSimIsDatacenter, dict.flags.datacenter],
                ] as const
              ).map(([key, val, setter, label]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 px-2.5 py-1.5"
                >
                  <span className="truncate text-xs">{label}</span>
                  <Switch checked={val} onCheckedChange={setter} ariaLabel={label} />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between rounded-xl border border-primary/35 bg-primary/10 px-4 py-3">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">
                  {dict.rules.sandboxVerdict}
                </p>
                <Badge
                  variant={
                    simulatedOutcome.action === "block"
                      ? "destructive"
                      : simulatedOutcome.action === "challenge"
                        ? "warning"
                        : "success"
                  }
                  className="mt-1 font-mono text-xs uppercase"
                >
                  {simulatedOutcome.action}
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-medium text-muted-foreground">
                  {dict.rules.sandboxMatched}
                </p>
                <p className="mt-1 font-mono text-xs font-semibold text-foreground">
                  {simulatedOutcome.matchedRuleId ?? dict.common.none}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Rules List */}
      <div className="grid gap-4">
        {rules.map((rule) => (
          <Card key={rule.publicId}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span className="font-semibold">{rule.name}</span>
                  <CopyableMono
                    value={rule.publicId}
                    copyLabel={dict.common.copy}
                    copiedLabel={dict.common.copied}
                  />
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {dict.rules.priority}: #{rule.priority}
                  </Badge>
                  <Badge
                    variant={
                      rule.action === "block"
                        ? "destructive"
                        : rule.action === "challenge"
                          ? "warning"
                          : "success"
                    }
                  >
                    {rule.action}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-1.5 font-mono text-xs text-muted-foreground">
                  {rule.conditions.map((c, idx) => (
                    <Badge key={idx} variant="outline" className="font-mono text-xs">
                      {c.field} {c.operator} {String(c.value)}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right font-mono text-xs">
                  <p className="text-muted-foreground">{dict.rules.hitCount}</p>
                  <p className="font-bold text-foreground">{rule.hitCount}</p>
                </div>

                <Switch
                  checked={rule.isEnabled}
                  ariaLabel={rule.name}
                  onCheckedChange={(checked) => handleToggle(rule.publicId, checked)}
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(rule.publicId)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
