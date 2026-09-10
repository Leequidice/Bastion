import React from "react";
import { X, Package, Hammer, Zap, Wheat, Sparkles, Droplets } from "lucide-react";
import { RESOURCE_PACKS, CREDITCOIN_TESTNET, FAUCET_URL } from "../lib/constants";

interface ResourcePackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchase: (packId: string) => void;
  purchasingPackId: string | null;
  purchasePackError: string | null;
}

export const ResourcePackModal: React.FC<ResourcePackModalProps> = ({
  isOpen,
  onClose,
  onPurchase,
  purchasingPackId,
  purchasePackError,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-dark-deep/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="panel-parchment rounded-md w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-rule flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm border border-accent-500 flex items-center justify-center text-accent-700">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-display text-ink">Resource Packs</h2>
              <p className="text-xs text-ink-faint italic">
                A bulk shipment to the Vault, paid in {CREDITCOIN_TESTNET.currencySymbol}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-ink-faint hover:text-ink transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {purchasePackError && (
            <div className="text-[11px] text-[#7a2318] border border-[#7a2318]/50 rounded-sm px-3 py-2 flex flex-col gap-1.5" role="alert">
              <span>{purchasePackError}</span>
              <a
                href={FAUCET_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 self-start text-accent-700 hover:text-accent-900 font-semibold"
              >
                <Droplets className="w-3 h-3" />
                Visit Faucet
              </a>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {RESOURCE_PACKS.map((pack) => {
              const isPurchasing = purchasingPackId === pack.id;
              return (
                <div
                  key={pack.id}
                  className="border border-rule rounded-sm p-4 flex flex-col gap-3 bg-paper-lit"
                >
                  <div>
                    <h3 className="font-display text-base text-ink">{pack.name}</h3>
                    <p className="text-lg font-mono font-bold text-accent-700">
                      {pack.priceCTC} {CREDITCOIN_TESTNET.currencySymbol}
                    </p>
                  </div>

                  <div className="flex flex-col gap-1 text-xs font-mono text-ink-soft">
                    <span className="flex items-center gap-1.5">
                      <Hammer className="w-3.5 h-3.5 text-ink-faint" /> {pack.resources.stone} Stone
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-ink-faint" /> {pack.resources.energy} Energy
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Wheat className="w-3.5 h-3.5 text-ink-faint" /> {pack.resources.food} Food
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-ink-faint" /> {pack.resources.aegisAlloy} Alloy
                    </span>
                  </div>

                  <button
                    onClick={() => onPurchase(pack.id)}
                    disabled={isPurchasing}
                    className="btn-manuscript py-2 rounded-sm text-xs mt-auto"
                  >
                    {isPurchasing ? "Confirming..." : "Buy"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-rule flex items-center justify-end">
          <button
            onClick={onClose}
            className="btn-manuscript-quiet px-4 py-2 rounded-sm text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
