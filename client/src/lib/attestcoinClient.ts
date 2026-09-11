import { ethers } from "ethers";
import { PrecompileChainInfoProvider } from "@gluwa/usc-sdk/dist/chain-info";
import { ProofBuilder } from "@gluwa/usc-sdk/dist/proof-provider/service";
import type { ContinuityResponse } from "@gluwa/usc-sdk/dist/proof-provider";
import { CREDITCOIN_TESTNET, SOURCE_CHAINS, CONTRACT_ADDRESSES, SEPOLIA_RPC_URL } from "./constants";

/**
 * Minimal ABI for the deployed BastionIncursionEngine — only the entry point that
 * submits a real Attestcoin proof to precompile 0x0FD2, and the event it emits.
 */
export const INCURSION_ENGINE_ABI = [
  {
    type: "function",
    name: "triggerIncursionCheck",
    stateMutability: "nonpayable",
    inputs: [
      { name: "chainKey", type: "uint64" },
      { name: "blockHeight", type: "uint64" },
      { name: "encodedTransaction", type: "bytes" },
      {
        name: "merkleProof",
        type: "tuple",
        components: [
          { name: "root", type: "bytes32" },
          {
            name: "siblings",
            type: "tuple[]",
            components: [
              { name: "hash", type: "bytes32" },
              { name: "isLeft", type: "bool" },
            ],
          },
        ],
      },
      {
        name: "continuityProof",
        type: "tuple",
        components: [
          { name: "lowerEndpointDigest", type: "bytes32" },
          { name: "roots", type: "bytes32[]" },
        ],
      },
    ],
    outputs: [{ name: "incursionId", type: "uint256" }],
  },
  {
    type: "event",
    name: "IncursionTriggered",
    inputs: [
      { name: "incursionId", type: "uint256", indexed: true },
      { name: "colossusType", type: "uint8", indexed: false },
      { name: "severity", type: "uint32", indexed: false },
      { name: "sourceChain", type: "uint64", indexed: true },
      { name: "blockHeight", type: "uint64", indexed: true },
      { name: "txKey", type: "bytes32", indexed: false },
      { name: "colossusHp", type: "uint256", indexed: false },
      { name: "siegePower", type: "uint256", indexed: false },
    ],
  },
] as const;

const SEPOLIA_CHAIN_KEY = SOURCE_CHAINS.SEPOLIA.chainKey;

/** Real, live Attestcoin attestation state for Sepolia, read from the ChainInfo precompile on Creditcoin. */
export interface LiveAttestationSnapshot {
  chainKey: number;
  chainName: string;
  attestedHeight: number;
  attestedHash: string;
  /** 0-1500 basis points, deterministically derived from the live attested hash. */
  discountBps: number;
  fetchedAt: number;
}

/** Outcome of a real, on-chain Attestcoin verification against precompile 0x0FD2. */
export interface RealIncursionResult {
  incursionId: number;
  archetype: number;
  severity: number;
  hp: number;
  siegePower: number;
  sourceChain: number;
  sourceBlockHeight: number;
  txKey: string;
  /** Hash of the Creditcoin tx that called triggerIncursionCheck (the real on-chain verification). */
  verificationTxHash: string;
  /** Hash of the real, attested Ethereum Sepolia transaction the proof was built from. */
  sourceTxHash: string;
  merkleProof: ContinuityResponse["merkleProof"];
  continuityProof: ContinuityResponse["continuityProof"];
  cached: boolean;
}

function creditcoinReadProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(CREDITCOIN_TESTNET.rpcUrl);
}

/**
 * Reads the latest Ethereum Sepolia checkpoint Creditcoin's own ChainInfo precompile
 * (0x...0fd3) has attested, and derives a small live discount from its real digest.
 * Used both to price-check paid actions and as the fallback source of "which block
 * counts as this run's tremor" for triggerRealIncursion.
 */
export async function fetchLiveAttestationSnapshot(): Promise<LiveAttestationSnapshot> {
  const provider = new PrecompileChainInfoProvider(creditcoinReadProvider());
  const latest = await provider.getLatestAttestedHeightAndHash(SEPOLIA_CHAIN_KEY);
  if (!latest.exists) {
    throw new Error("No attested Ethereum Sepolia checkpoint is available on Creditcoin yet.");
  }
  const discountBps = (parseInt(latest.hash.slice(-4), 16) % 16) * 100;
  return {
    chainKey: SEPOLIA_CHAIN_KEY,
    chainName: SOURCE_CHAINS.SEPOLIA.name,
    attestedHeight: latest.height,
    attestedHash: latest.hash,
    discountBps,
    fetchedAt: Date.now(),
  };
}

/** Applies a live-attestation-derived discount (0-15%) to a base tCTC fee. */
export function applyAttestationDiscount(baseFeeCTC: number, snapshot: LiveAttestationSnapshot | null): number {
  if (!snapshot) return baseFeeCTC;
  return Number((baseFeeCTC * (1 - snapshot.discountBps / 10000)).toFixed(6));
}

/** Collects real Sepolia transaction hashes from the most recently attested blocks, newest first. */
async function collectCandidateTxHashes(
  sepoliaProvider: ethers.JsonRpcProvider,
  startHeight: number,
  maxBlocksBack = 5,
  maxCandidates = 5
): Promise<string[]> {
  const hashes: string[] = [];
  for (let h = startHeight; h > startHeight - maxBlocksBack && hashes.length < maxCandidates; h--) {
    const block = await sepoliaProvider.getBlock(h);
    if (block?.transactions?.length) {
      hashes.push(...block.transactions.slice(0, maxCandidates - hashes.length));
    }
  }
  return hashes;
}

/**
 * The real, core Attestcoin flow behind "Sound the Horn":
 *  1. Reads the latest Sepolia checkpoint Creditcoin has actually attested.
 *  2. Fetches a real Merkle inclusion + continuity proof for a real transaction in
 *     that checkpoint from the official Attestcoin prover service.
 *  3. Submits that proof to the deployed BastionIncursionEngine, which verifies it
 *     on-chain against the real Block Prover Precompile (0x0FD2) and deterministically
 *     derives the Colossus for this wave from the verified data.
 * Every value returned comes from that on-chain transaction's emitted event — nothing
 * here is generated client-side.
 */
export async function triggerRealIncursion(
  signer: ethers.Signer,
  onStage?: (message: string) => void
): Promise<RealIncursionResult> {
  onStage?.("Reading the latest Attestcoin-attested Ethereum Sepolia checkpoint...");
  const chainInfoProvider = new PrecompileChainInfoProvider(creditcoinReadProvider());
  const latest = await chainInfoProvider.getLatestAttestedHeightAndHash(SEPOLIA_CHAIN_KEY);
  if (!latest.exists) {
    throw new Error("No attested Ethereum Sepolia checkpoint is available yet. Try again shortly.");
  }

  onStage?.(`Locating a real Sepolia transaction in attested block #${latest.height}...`);
  const sepoliaProvider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
  const candidates = await collectCandidateTxHashes(sepoliaProvider, latest.height);
  if (candidates.length === 0) {
    throw new Error("Could not find a recent Sepolia transaction to verify. Try again shortly.");
  }

  onStage?.("Building the Merkle + continuity proof via the Attestcoin prover...");
  const proofBuilder = new ProofBuilder(SEPOLIA_CHAIN_KEY, CREDITCOIN_TESTNET.proverApiUrl);
  let proof: ContinuityResponse | null = null;
  for (const txHash of candidates) {
    const result = await proofBuilder.getProof(txHash);
    if (result.success && result.data) {
      proof = result.data;
      break;
    }
  }
  if (!proof) {
    throw new Error("The Attestcoin prover could not generate a proof for the latest attested block.");
  }

  onStage?.("Confirm in your wallet — verifying on Creditcoin via precompile 0x0FD2...");
  const engine = new ethers.Contract(CONTRACT_ADDRESSES.incursionEngine, INCURSION_ENGINE_ABI, signer);
  const tx = await engine.triggerIncursionCheck(
    proof.chainKey,
    proof.headerNumber,
    proof.txBytes,
    proof.merkleProof,
    proof.continuityProof
  );

  onStage?.("Awaiting on-chain confirmation...");
  const receipt = await tx.wait();
  if (!receipt) {
    throw new Error("Verification transaction did not confirm.");
  }

  const parsedEvent = receipt.logs
    .map((log: ethers.Log) => {
      try {
        return engine.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((parsed: ethers.LogDescription | null) => parsed?.name === "IncursionTriggered");

  if (!parsedEvent) {
    throw new Error("Verification succeeded but no IncursionTriggered event was found in the receipt.");
  }

  return {
    incursionId: Number(parsedEvent.args.incursionId),
    archetype: Number(parsedEvent.args.colossusType),
    severity: Number(parsedEvent.args.severity),
    hp: Number(parsedEvent.args.colossusHp),
    siegePower: Number(parsedEvent.args.siegePower),
    sourceChain: Number(parsedEvent.args.sourceChain),
    sourceBlockHeight: Number(parsedEvent.args.blockHeight),
    txKey: parsedEvent.args.txKey as string,
    verificationTxHash: tx.hash,
    sourceTxHash: proof.txHash,
    merkleProof: proof.merkleProof,
    continuityProof: proof.continuityProof,
    cached: proof.cached,
  };
}
