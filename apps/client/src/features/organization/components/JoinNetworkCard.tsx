import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { acceptInvite } from "@/lib/accountApi";

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
    <div className="rounded-xl border border-white/10 bg-[#2a1f3d] p-5">
      <h2 className="text-base font-semibold text-white">Have an invitation code?</h2>
      <p className="mt-1 text-sm text-gray-400">
        Join another church's network as a branch. Your songs, presentations and
        services stay yours.
      </p>
      <div className="mt-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="XXXX-XXXX"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="border-white/10 bg-[#120a22] font-mono tracking-widest text-white placeholder:text-gray-500 sm:max-w-[200px]"
            aria-label="Invitation code"
          />
          <Button className="bg-[#8356F3] text-white hover:bg-[#7245e2]" onClick={join} disabled={busy || code.trim().length < 4}>
            {busy ? "Joining…" : "Join network"}
          </Button>
        </div>
      </div>
    </div>
  );
};
