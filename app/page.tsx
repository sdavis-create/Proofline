import { connection } from "next/server";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  checkSupabaseHealth,
  type SupabaseHealth,
} from "@/lib/supabase/health";

export default async function Home() {
  await connection();
  const health = await checkSupabaseHealth();

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Hello Proofline</CardTitle>
          <CardDescription>
            Upload a design once. List it everywhere, safely.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4 text-sm">
          <span className="text-muted-foreground">Database</span>
          <HealthBadge health={health} />
        </CardContent>
      </Card>
    </main>
  );
}

function HealthBadge({ health }: { health: SupabaseHealth }) {
  switch (health.status) {
    case "ok":
      return <Badge>Connected</Badge>;
    case "not_configured":
      return <Badge variant="outline">Not configured</Badge>;
    case "error":
      return (
        <Badge variant="destructive" title={health.message}>
          Unreachable
        </Badge>
      );
  }
}
