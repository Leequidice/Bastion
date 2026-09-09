import { ethers } from "ethers";

const RPC_URL = process.env.CREDITCOIN_RPC_URL || "https://rpc.cc3-testnet.creditcoin.network";
const privateKey = process.env.OPERATOR_PRIVATE_KEY;

if (!privateKey) {
  throw new Error("OPERATOR_PRIVATE_KEY must be set (see .env.example) to sign faucet drips");
}

export const DRIP_AMOUNT_CTC = process.env.DRIP_AMOUNT_CTC || "1";
export const OPERATOR_MIN_BALANCE_CTC = process.env.OPERATOR_MIN_BALANCE_CTC || "2";

const provider = new ethers.JsonRpcProvider(RPC_URL);
export const operatorWallet = new ethers.Wallet(privateKey, provider);

export async function getOperatorBalanceCTC(): Promise<number> {
  const balance = await provider.getBalance(operatorWallet.address);
  return Number(ethers.formatEther(balance));
}
