# HSK Chain Integration & Verification Specification

This document provides the network specifications, RPC architecture, contract interface, and on-chain verification workflow for **HSK Chain** within **TeleSol PayPilot**.

---

## 1. Network Parameters

HSK Chain is an EVM-compatible Layer 2 / Layer 1 infrastructure designed for high-throughput, low-latency institutional and agentic settlements.

### Testnet
- **Network Name**: HSK Testnet
- **Chain ID**: `133` (Hex: `0x85`)
- **Native Currency**: `HSK` (Symbol: `HSK`, Decimals: `18`)
- **RPC URL**: `https://testnet.hsk.xyz`
- **Block Explorer**: `https://testnet-explorer.hskchain.net`

### Mainnet
- **Network Name**: HSK Mainnet
- **Chain ID**: `177` (Hex: `0xb1`)
- **Native Currency**: `HSK` (Symbol: `HSK`, Decimals: `18`)
- **RPC URL**: `https://mainnet.hsk.xyz`
- **Block Explorer**: `https://hsk.blockscout.com`

---

## 2. On-Chain Verification Engine

TeleSol PayPilot implements an independent, zero-trust verification module in `backend/app/paypilot/hsk_chain.py`. It does not rely on third-party aggregators or trust frontend claims.

### Verification Algorithm
```
1. Client submits Transaction Hash (tx_hash) & Chain ID.
2. Chain Adapter checks if chain_id matches HSK Testnet (133) or Mainnet (177).
3. Chain Adapter connects to the configured HSK RPC endpoint.
4. Executes JSON-RPC `eth_getTransactionReceipt(tx_hash)`.
5. If status == '0x1':
     Executes `eth_blockNumber` to compute confirmations:
     confirmations = current_block - receipt.blockNumber + 1
     Status = VERIFIED
   If status == '0x0':
     Status = FAILED (reverted)
   If receipt is null:
     Status = PENDING (in mempool)
6. Compares payee, amount, and token logs to Mandate requirements.
7. Emits immutable Audit Trail log and generates Settlement Receipt.
```

### Supported Token Standards
- **HSK**: Native gas and settlement currency.
- **USDT / USDC**: Standard ERC-20 contract tokens deployed on HSK Chain.

---

## 3. Smart Contract: `AgentPolicyRegistry.sol`

Located at: [`contracts/AgentPolicyRegistry.sol`](file:///Users/user/Documents/TeleSol-mac-release/contracts/AgentPolicyRegistry.sol)

### Architectural Decoupling
To maintain non-custodial agentic principles and support the HashKey Settlement Protocol (HSP), the smart contract **does not hold funds or custody user assets**. Instead, it acts as an immutable on-chain policy and identity registry:

1. **Agent Registration**: Binds an agent string ID (`agt_buyer_router_alpha`) to an EVM owner address and role (`BUYER`, `PROVIDER`, `PAYMENT`).
2. **Policy Hash Anchoring**: Anchors the cryptographic hash of spending policies (`keccak256(policy_json)`) on HSK Chain to prevent client-side or off-chain tampering.
3. **Emergency Circuit Breaker**: Allows authorized controllers to revoke an agent's on-chain status if malicious activity is detected.

### Contract Interface & ABI
```solidity
enum AgentRole { NONE, BUYER, PROVIDER, PAYMENT }

function registerAgent(string memory agentId, address agentWallet, AgentRole role) external;
function setAgentStatus(string memory agentId, bool isActive) external;
function anchorPolicyHash(string memory agentId, bytes32 policyHash) external;
function verifyPolicyHash(string memory agentId, bytes32 policyHash) external view returns (bool);
function getAgent(string memory agentId) external view returns (address agentWallet, AgentRole role, bool isActive, bytes32 policyHash, uint256 registeredAt);
```

### Deployment Instructions
Run the automated deployment script using Hardhat or Node.js:
```bash
# Set your deployment private key
export DEPLOYER_PRIVATE_KEY="0x..."

# Deploy to HSK Testnet
node contracts/scripts/deploy.js testnet

# Deploy to HSK Mainnet
node contracts/scripts/deploy.js mainnet
```
The script outputs the deployed address and automatically writes the artifact to `contracts/deployments.json`.
