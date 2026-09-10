import React from "react";
import { X, BookOpen, Coins, Sprout, Trophy, Droplets } from "lucide-react";
import {
  CREDITCOIN_TESTNET,
  FAUCET_URL,
  DRIP_AMOUNT_CTC,
  HEAL_ALL_FEE_CTC,
  UPGRADE_ALL_BASE_FEE_CTC,
  CONTINUE_AFTER_BREACH_FEE_CTC,
  STONE_PER_CTC,
  ENERGY_PER_CTC,
  MAX_STRUCTURE_LEVEL,
  LEVEL_15_CHALLENGE_LEVEL,
  LEVEL_15_CHALLENGE_MULTIPLIER,
} from "../lib/constants";

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasClaimedLevel15Reward: boolean;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({
  isOpen,
  onClose,
  hasClaimedLevel15Reward,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-dark-deep/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="panel-parchment rounded-md w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-rule flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm border border-accent-500 flex items-center justify-center text-accent-700">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-display text-ink">A Chronicle for New Commanders</h2>
              <p className="text-xs text-ink-faint italic">How to fortify, defend, and prosper</p>
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
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Core loop */}
          <section className="flex flex-col gap-2">
            <h3 className="font-display text-base text-accent-700">The Core Loop</h3>
            <p className="text-ink-soft leading-relaxed">
              Bastion is a wave-defense city-builder. Between waves, place structures on the
              12x12 grid from the Construction Palette — <strong className="text-ink">Defenses</strong>{" "}
              (Aegis Rampart, Ballista Bastion, Sunstone Battery) fire automatically on anything
              marching down the lane; <strong className="text-ink">Resources</strong> (Stone Quarry,
              Terrace Hydro-Farm, Sunstone Collector) feed your vault. When you're ready, click
              "Sound the Horn" to spawn that level's Titan. It marches toward your Wall; if it
              reaches it, the Wall falls and the run ends. Repel it, and the next level begins —
              tougher, but more rewarding.
            </p>
          </section>

          {/* Resources */}
          <section className="flex flex-col gap-2">
            <h3 className="font-display text-base text-accent-700 flex items-center gap-2">
              <Sprout className="w-4 h-4" /> Getting Resources
            </h3>
            <ul className="list-disc list-inside space-y-1.5 text-ink-soft leading-relaxed">
              <li>
                <strong className="text-ink">Harvest Vault</strong> (in the resource bar) is your
                baseline income — click it any time for a batch of Stone, Energy, and Food, scaled
                by the current cross-chain market condition shown next to it.
              </li>
              <li>
                <strong className="text-ink">Aegis Alloy</strong> comes along for the ride: every
                Harvest also mints Alloy equal to 10% of that Harvest's Stone gain — Quarries are
                the source, so the more Stone you pull in, the more Alloy follows. New commanders
                start with 100 Alloy on their very first login.
              </li>
              <li>
                Repelling a wave pays a <strong className="text-ink">bounty</strong> in Stone and
                Energy, scaling with the level you just cleared.
              </li>
              <li>
                Resources buy and upgrade structures (see their cost tags in the Construction
                Palette) and repair damaged ones. Structures can be leveled up to a cap of{" "}
                {MAX_STRUCTURE_LEVEL}.
              </li>
            </ul>
          </section>

          {/* Money / transactions */}
          <section className="flex flex-col gap-2">
            <h3 className="font-display text-base text-accent-700 flex items-center gap-2">
              <Coins className="w-4 h-4" /> Where Real Transactions Come In
            </h3>
            <p className="text-ink-soft leading-relaxed">
              Everything above is free and playable forever with zero tokens. A handful of
              conveniences and comebacks are gated behind small {CREDITCOIN_TESTNET.currencySymbol}{" "}
              (Creditcoin testnet token) transactions instead of a resource cost — these exist so
              you can skip grinding when you want to, never because you have to:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-ink-soft leading-relaxed">
              <li>
                <strong className="text-ink">Heal All</strong> (per structure type, in the
                Construction Palette) — repairs every damaged structure of that type for a flat{" "}
                {HEAL_ALL_FEE_CTC} {CREDITCOIN_TESTNET.currencySymbol} fee, no Stone required.
              </li>
              <li>
                <strong className="text-ink">Upgrade All</strong> — levels up every eligible
                structure of one type for a base fee of {UPGRADE_ALL_BASE_FEE_CTC}{" "}
                {CREDITCOIN_TESTNET.currencySymbol}. If you're short on the usual Stone/Energy
                cost, the shortfall is priced in and added to the fee automatically (roughly 1{" "}
                {CREDITCOIN_TESTNET.currencySymbol} per {STONE_PER_CTC} Stone or {ENERGY_PER_CTC}{" "}
                Energy you're missing) instead of blocking the upgrade outright.
              </li>
              <li>
                <strong className="text-ink">Continue After a Breach</strong> — if the Wall falls,
                you can pay {CONTINUE_AFTER_BREACH_FEE_CTC} {CREDITCOIN_TESTNET.currencySymbol} to
                resume from the exact level you were on, instead of restarting at level 1.
              </li>
            </ul>
          </section>

          {/* Playing without money */}
          <section className="flex flex-col gap-2">
            <h3 className="font-display text-base text-accent-700 flex items-center gap-2">
              <Droplets className="w-4 h-4" /> Playing Without Spending Anything
            </h3>
            <p className="text-ink-soft leading-relaxed">
              None of the paid actions are required. Skip them and you can still repair, upgrade,
              and progress purely with harvested resources and wave bounties — it just takes a
              little longer. If a wave breaks your Wall, "Start Over" is always free (you keep your
              structures and resources, only the level resets to 1).
            </p>
            <p className="text-ink-soft leading-relaxed">
              Every new commander also receives a one-time faucet drip of {DRIP_AMOUNT_CTC}{" "}
              {CREDITCOIN_TESTNET.currencySymbol} automatically after their first login — enough to
              try the paid actions once. Need more later? Visit the faucet from the account menu or{" "}
              <a
                href={FAUCET_URL}
                target="_blank"
                rel="noreferrer"
                className="text-accent-700 hover:text-accent-900 underline"
              >
                here
              </a>
              .
            </p>
          </section>

          {/* Level 15 challenge */}
          <section className="flex flex-col gap-2 border border-accent-500/50 rounded-sm p-4 bg-accent-300/10">
            <h3 className="font-display text-lg text-accent-700 flex items-center gap-2">
              <Trophy className="w-5 h-5" /> The Level {LEVEL_15_CHALLENGE_LEVEL} Challenge
            </h3>
            <p className="text-ink-soft leading-relaxed">
              Hold the Wall through Level {LEVEL_15_CHALLENGE_LEVEL}, and the moment you reach it,
              every resource in your vault — Stone, Energy, Food, and Aegis Alloy — is multiplied{" "}
              <strong className="text-ink">{LEVEL_15_CHALLENGE_MULTIPLIER}x</strong>, once per
              account. It's the single biggest payout in the game, entirely earned by holding the
              line.
            </p>
            <p className="text-xs font-mono text-accent-700">
              {hasClaimedLevel15Reward
                ? "You've already claimed this reward on this account."
                : "Not yet claimed — the Wall is waiting."}
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-rule flex items-center justify-end">
          <button
            onClick={onClose}
            className="btn-manuscript px-4 py-2 rounded-sm text-xs"
          >
            Close Chronicle
          </button>
        </div>
      </div>
    </div>
  );
};
