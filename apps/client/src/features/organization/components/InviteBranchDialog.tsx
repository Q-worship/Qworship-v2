import React, { useState } from "react";
import { Copy, Check, Link2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { createInvite, type PendingInvite } from "../api";

/**
 * Two ways to add a church, one dialog: a code the church redeems, or an
 * invitation to a registered church's email. They differ only in how the
 * invitation reaches them — the server records both the same way.
 */

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvited: () => void;
  slotsAvailable: number;
}

export const InviteBranchDialog: React.FC<Props> = ({ open, onOpenChange, onInvited, slotsAvailable }) => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<PendingInvite | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = () => { setEmail(""); setCreated(null); setCopied(false); };

  const submit = async (method: "code" | "email") => {
    setBusy(true);
    try {
      const { invite } = await createInvite(method === "email" ? { method, email } : { method });
      onInvited();
      if (method === "code") {
        setCreated(invite);
      } else {
        toast({ title: "Invitation sent", description: `${email} can now join as a branch.` });
        onOpenChange(false);
        reset();
      }
    } catch (error: any) {
      // The server's refusal says why — out of slots, bad address — so show it.
      toast({ title: "Could not create the invitation", description: error.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!created?.code) return;
    try {
      await navigator.clipboard.writeText(created.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Could not copy", description: "Select the code and copy it manually.", variant: "destructive" });
    }
  };

  const noSlots = slotsAvailable < 1;

  return (
    <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) reset(); }}>
      <DialogContent className="sm:max-w-md">
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Invitation code ready</DialogTitle>
              <DialogDescription>
                Share this with the church you are adding. They enter it in their own
                Qworship account to join as a branch.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md border bg-muted px-3 py-2.5 text-center text-lg font-mono tracking-widest">
                {created.code}
              </code>
              <Button type="button" variant="outline" size="icon" onClick={copy} aria-label="Copy code">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Expires {new Date(created.expiresAt).toLocaleDateString()}. It holds one slot
              until it is used or withdrawn, and works only once.
            </p>
            <DialogFooter>
              <Button onClick={() => { onOpenChange(false); reset(); }}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add a church</DialogTitle>
              <DialogDescription>
                {noSlots
                  ? "Every slot is in use. Add a pack or remove a branch first."
                  : `${slotsAvailable} ${slotsAvailable === 1 ? "slot is" : "slots are"} available.`}
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="code">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="code" className="gap-1.5">
                  <Link2 className="h-3.5 w-3.5" /> Share a code
                </TabsTrigger>
                <TabsTrigger value="email" className="gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> Invite by email
                </TabsTrigger>
              </TabsList>

              <TabsContent value="code" className="space-y-3 pt-4">
                <p className="text-sm text-muted-foreground">
                  Generates a one-time code for a church that has not joined yet, or
                  whose email you do not have.
                </p>
                <Button className="w-full" disabled={busy || noSlots} onClick={() => submit("code")}>
                  {busy ? "Creating…" : "Generate code"}
                </Button>
              </TabsContent>

              <TabsContent value="email" className="space-y-3 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="branch-email">Church email address</Label>
                  <Input
                    id="branch-email"
                    type="email"
                    placeholder="office@branchchurch.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={busy || noSlots}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  They choose whether to join. Joining puts their church under this
                  account's administration, so it is never done for them.
                </p>
                <Button
                  className="w-full"
                  disabled={busy || noSlots || !email.trim()}
                  onClick={() => submit("email")}
                >
                  {busy ? "Sending…" : "Send invitation"}
                </Button>
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
