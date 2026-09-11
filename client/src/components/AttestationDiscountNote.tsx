import React from "react";
import { Sparkles } from "lucide-react";
import { LiveAttestationSnapshot } from "../lib/attestcoinClient";
import { CREDITCOIN_TESTNET } from "../lib/constants";

interface AttestationDiscountNoteProps {
  snapshot: LiveAttestationSnapshot | null;
  error: string | null;
  /** Pre-discount price, for the "was X" comparison. Omit to hide the price comparison. */
  baseFeeCTC?: number;
}

/**
 * Surfaces the live Attestcoin attestation state wherever a player is about to spend
 * real tCTC — Heal All, Upgrade All, Continue After Breach — so the on-chain data
 * backing the discount is visible at the exact moment money changes hands, not just
 * buried in a read-only inspector modal.
 */
export const AttestationDiscountNote: React.FC<AttestationDiscountNoteProps> = ({
  snapshot,
  error,
  baseFeeCTC,
}) => {
  if (error) {
    return <p className="text-[10px] text-ink-faint italic leading-relaxed">{error}</p>;
  }

  if (!snapshot) {
    return <p className="text-[10px] text-ink-faint italic leading-relaxed">Checking live Attestcoin discount…</p>;
  }

  const pct = snapshot.discountBps / 100;
  const shortHash = `${snapshot.attestedHash.slice(0, 6)}…${snapshot.attestedHash.slice(-4)}`;

  if (pct === 0) {
    return (
      <p className="text-[10px] text-ink-faint font-mono leading-relaxed flex items-start gap-1">
        <Sparkles className="w-3 h-3 shrink-0 mt-0.5 text-accent-700" />
        <span>
          No discount this checkpoint — {snapshot.chainName} #{snapshot.attestedHeight.toLocaleString()} ({shortHash}) attested on Creditcoin.
        </span>
      </p>
    );
  }

  return (
    <p className="text-[10px] text-accent-700 font-mono leading-relaxed flex items-start gap-1">
      <Sparkles className="w-3 h-3 shrink-0 mt-0.5" />
      <span>
        Live Attestcoin discount: -{pct.toFixed(0)}%
        {baseFeeCTC !== undefined && (
          <> (was {baseFeeCTC.toFixed(2)} {CREDITCOIN_TESTNET.currencySymbol})</>
        )}{" "}
        — derived from {snapshot.chainName} #{snapshot.attestedHeight.toLocaleString()} ({shortHash}) attested on Creditcoin.
      </span>
    </p>
  );
};
