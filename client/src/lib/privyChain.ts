import { defineChain } from "viem";
import { CREDITCOIN_TESTNET } from "./constants";

export const creditcoinTestnetChain = defineChain({
  id: CREDITCOIN_TESTNET.chainId,
  name: CREDITCOIN_TESTNET.chainName,
  nativeCurrency: {
    name: CREDITCOIN_TESTNET.currencyName,
    symbol: CREDITCOIN_TESTNET.currencySymbol,
    decimals: CREDITCOIN_TESTNET.decimals,
  },
  rpcUrls: {
    default: { http: [CREDITCOIN_TESTNET.rpcUrl] },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: CREDITCOIN_TESTNET.blockExplorerUrl },
  },
  testnet: true,
});
