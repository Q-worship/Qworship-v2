import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { acceptInvite } from "../api";

/**
 * Redeeming a code someone else issued. This is the other half of the invite
 * flow and belongs to the church joining, not the one inviting — which is why
 * accepting is always their own action.
 */

interface Props {
  onJoined: () => void;
}

export const JoinNetworkCard: React.FC<Props> = ({ onJoined }) => {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const join = async () => {
    setBusy(true);
    try {
      const { joined } = await acceptInvite(code.trim());
      toast({ title: "Joined", description: `${joined.name} is now part of that network.` });
      setCode("");
      onJoined();
    } catch (error: any) {
      toast({ title: "Could not join", description: error.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Have an invitation code?</CardTitle>
        <CardDescription>
          Join another church's network as a branch. Your songs, presentations and
          services stay yours.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="XXXX-XXXX"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="font-mono tracking-widest sm:max-w-[200px]"
            aria-label="Invitation code"
          />
          <Button onClick={join} disabled={busy || code.trim().length < 4}>
            {busy ? "Joining…" : "Join network"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
