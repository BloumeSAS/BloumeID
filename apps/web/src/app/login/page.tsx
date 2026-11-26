"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Shield, KeyRound, Globe } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const { dict, locale, setLocale } = useI18n();
  const router = useRouter();
  const [masterKey, setMasterKey] = React.useState("");
  const [errorKey, setErrorKey] = React.useState<"invalidKey" | "rateLimited" | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorKey(null);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterKey }),
      });

      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
        return;
      }

      if (res.status === 429) {
        setErrorKey("rateLimited");
      } else {
        setErrorKey("invalidKey");
      }
    } catch {
      setErrorKey("invalidKey");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="absolute right-6 top-6">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setLocale(locale === "fr" ? "en" : "fr")}
        >
          <Globe className="h-3.5 w-3.5" />
          <span>{locale.toUpperCase()}</span>
        </Button>
      </div>

      <Card className="w-full max-w-md border-primary/25 bg-card/90 shadow-2xl backdrop-blur-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
            <Shield className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">{dict.auth.title}</CardTitle>
          <CardDescription>{dict.auth.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="master-key-input">{dict.auth.masterKeyLabel}</Label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="master-key-input"
                  data-testid="master-key-input"
                  type="password"
                  value={masterKey}
                  onChange={(e) => setMasterKey(e.target.value)}
                  placeholder={dict.auth.masterKeyPlaceholder}
                  className="pl-9 font-mono"
                  required
                />
              </div>
            </div>

            {errorKey ? (
              <p
                data-testid="login-error"
                className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
              >
                {dict.auth[errorKey]}
              </p>
            ) : null}

            <Button
              type="submit"
              data-testid="login-submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? dict.common.loading : dict.auth.submit}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

