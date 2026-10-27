import React from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Buying churches in packs of ten.
 *
 * The stepper shows what each change costs and holds, because "packs" is our
 * word, not the customer's — what they are deciding is how many churches they
 * can have and what it comes to.
 */

interface Props {
  packs: number;
  onChange: (packs: number) => void;
  pricePerPack: number;
  slotsPerPack: number;
  /** Packs below this would strand churches already in use. */
  minimumPacks: number;
  disabled?: boolean;
}

export const PackStepper: React.FC<Props> = ({
  packs, onChange, pricePerPack, slotsPerPack, minimumPacks, disabled,
}) => {
  const atFloor = packs <= Math.max(1, minimumPacks);

  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-medium">{packs * slotsPerPack} churches</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {packs} {packs === 1 ? "pack" : "packs"} of {slotsPerPack}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button" variant="outline" size="icon"
            aria-label="Remove a pack"
            disabled={disabled || atFloor}
            onClick={() => onChange(packs - 1)}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-8 text-center text-lg font-semibold tabular-nums">{packs}</span>
          <Button
            type="button" variant="outline" size="icon"
            aria-label="Add a pack"
            disabled={disabled}
            onClick={() => onChange(packs + 1)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between border-t pt-3">
        <span className="text-sm text-muted-foreground">Monthly total</span>
        <span className="text-xl font-semibold tabular-nums">
          ${(packs * pricePerPack).toFixed(2)}
        </span>
      </div>

      {atFloor && minimumPacks > 1 && (
        // Explain the floor rather than just greying the button out.
        <p className="mt-2 text-xs text-muted-foreground">
          You cannot go below {minimumPacks} {minimumPacks === 1 ? "pack" : "packs"} while
          your churches and pending invitations need the slots. Remove some first.
        </p>
      )}
    </div>
  );
};
