# BASTION — Judge Demonstration & Testing Guide
### BUIDL CTC 2026 Fall Hackathon (Gaming Track)

This guide provides step-by-step instructions to run, verify, and interact with **Bastion** both via automated tests and through the interactive 2D settlement builder UI.

---

## 1. Quick Verification (CLI Unit Tests)
Bastion includes a comprehensive test suite covering all 3 phases (Incursions, Dynamic Economy, and Structure NFTs):

```bash
# In the root repository directory:
npx hardhat test
```

### Expected Output:
- **16 Passing Tests**:
  - `BastionIncursionEngine`: Fallback precompile address, proof verification, deterministic incursion parameter derivation, replay attack rejection, combat resolution, breach detection.
  - `BastionEconomy`: Baseline conditions, settlement harvesting, cross-chain market shifts, resource trade, spending validation.
  - `BastionStructures`: ERC-721 tokenization, battle damage application, structure repair, level upgrades, on-chain attestation hashes.

---

## 2. End-to-End Incursion Simulation
Run the automated end-to-end script that simulates a full incursion lifecycle:
```bash
npx hardhat run scripts/demo-incursion.js
```

### What this demonstrates:
1. Emits a source chain tremor on Ethereum Sepolia (`chainKey: 1`).
2. Constructs the Attestcoin Merkle proof and Continuity proof.
3. Calls `BastionIncursionEngine.triggerIncursionCheck()`, verifying proofs against the precompile interface.
4. Spawns a deterministic Colossus with dynamic HP and Siege Power.
5. Simulates the commander mobilizing defenses to repel the threat and claim the bounty.

---

## 3. Deploying Contracts
To deploy all Bastion contracts to a local node or Creditcoin Testnet:

```bash
# Local deployment:
npx hardhat run scripts/deploy.js

# Creditcoin CC3 Testnet deployment (requires PRIVATE_KEY with tCTC in .env):
npx hardhat run scripts/deploy.js --network creditcoinTestnet
```

### Creditcoin CC3 Testnet Details:
* **Network Name:** Creditcoin Testnet
* **Chain ID:** `102031` (`0x18E8F`)
* **RPC URL:** `https://rpc.cc3-testnet.creditcoin.network/`
* **Currency Symbol:** `tCTC`
* **Block Explorer:** `https://creditcoin-testnet.blockscout.com/`
* **Attestcoin Precompile:** `0x0000000000000000000000000000000000000FD2`

---

## 4. Running the Interactive 2D React City-Builder
To launch the tactical web interface:

```bash
cd client
npm install
npm run dev
```
Open your browser to `http://localhost:5173`.

### Interactive Evaluation Steps for Judges:
1. **Explore the Tactical Grid:** Observe the 12x12 Redoubt Grid with the central Citadel Core, outer Aegis Ramparts, and Ballista Bastions.
2. **Build Fortifications:** Select structures from the **Construction Palette** (Ramparts, Ballistas, Sunstone Batteries, Quarries, Farms) and click empty grid tiles to place them.
3. **Inspect On-Chain Structure State (Phase 3):** Click any placed structure on the canvas to open the **Structure Inspector**. Inspect its ERC-721 token ID, durability bar, and cryptographic state attestation hash (`0x...`).
4. **Trigger Attested Incursion (Phase 1):** In the right-hand **Attested Threat Radar**, click **"Poll Attested Incursion (Sepolia)"**. Observe the precompile verification and watch the Colossus appear outside the northern perimeter.
5. **Inspect the Cryptographic Proof:** Click **"Precompile: 0x0FD2"** in the top navigation bar to open the **Attestation Inspector Modal**. Inspect the live Merkle root, sibling branches, continuity checkpoints, and gas formula.
6. **Mobilize Defenses:** Click **"Mobilize Defense Artillery"**. Watch the ballistas and sunstone pylons fire projectile arcs and plasma beams at the Colossus, depleting its HP and celebrating victory with a bounty reward!
7. **Harvest & Market Scarcity (Phase 2):** Click **"Harvest Vault"** to claim resources adjusted by live cross-chain market volatility multipliers.
