import { PrivyClient } from "@privy-io/server-auth";

const appId = process.env.PRIVY_APP_ID;
const appSecret = process.env.PRIVY_APP_SECRET;

if (!appId || !appSecret) {
  throw new Error("PRIVY_APP_ID and PRIVY_APP_SECRET must be set (see .env.example)");
}

export const privy = new PrivyClient(appId, appSecret);
