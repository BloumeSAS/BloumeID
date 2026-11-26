"use client";

import * as React from "react";
import { Plus, ShieldCheck, Trash2 } from "lucide-react";
import type { SecurityRuleAction } from "@bloumeid/sdk";
import type { RuleConditionField, RuleConditionOperator } from "@/lib/engine/rules";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const priority = 25;

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{dict.rules.title}</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">{dict.rules.subtitle}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{dict.rules.createRule}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div className="space-y-1.5 lg:col-span-2">
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

            <div className="flex items-end gap-2">
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
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

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

