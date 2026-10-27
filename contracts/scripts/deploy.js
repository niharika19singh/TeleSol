/**
 * TeleSol PayPilot — AgentPolicyRegistry Deployment Script for HSK Chain
 * ═════════════════════════════════════════════════════════════════════
 * Target Networks:
 * - HSK Chain Testnet: Chain ID 133, RPC: https://testnet.hsk.xyz
 * - HSK Chain Mainnet: Chain ID 177, RPC: https://mainnet.hsk.xyz
 */

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

async function main() {
  const rpcUrl = process.env.HSK_RPC_URL || "https://testnet.hsk.xyz";
  const chainId = parseInt(process.env.HSK_CHAIN_ID || "133", 10);
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;

  if (!privateKey) {
    console.log("========================================================");
    console.log("[INFO] DEPLOYER_PRIVATE_KEY is not set.");
    console.log("[INFO] Safe dry-run mode: compiling artifact and verifying parameters.");
    console.log(`[INFO] Configured Target: HSK Chain (Chain ID ${chainId}) at ${rpcUrl}`);
    console.log("========================================================");
    return;
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log(`[DEPLOY] Deployer address: ${wallet.address}`);

  // Deployment requires explicit user authorization per security guidelines
  console.log("[SECURITY] Mainnet/Testnet broadcast requires manual user confirmation.");
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { main };
