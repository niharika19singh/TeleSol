// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AgentPolicyRegistry
 * @dev On-chain transparent registry for autonomous agents and spending policy hashes on HSK Chain.
 *
 * IMPORTANT ARCHITECTURAL SEPARATION:
 * - This contract anchors verifiable agent metadata and policy commitments on HSK Chain.
 * - This contract DOES NOT execute HSP gateway payments (HSP handles payment gateway processing).
 * - Registering an agent on-chain DOES NOT automatically authorize payments. Explicit wallet
 *   authorization signatures and HSP mandate checks are strictly required off-chain.
 */
contract AgentPolicyRegistry {
    // ── Enums ──
    enum AgentRole { BUYER, PROVIDER, PAYMENT }
    enum AgentStatus { ACTIVE, INACTIVE, SUSPENDED }

    // ── Structs ──
    struct Agent {
        string id;
        address walletAddress;
        AgentRole role;
        AgentStatus status;
        bytes32 capabilitiesHash;
        string metadataURI;
        uint256 registeredAt;
        uint256 updatedAt;
    }

    struct PolicyAnchor {
        bytes32 policyId;
        bytes32 policyHash; // Keccak-256 hash of deterministic rules
        uint256 maxAmountPerTx; // In base units (wei or token decimals)
        uint256 maxDailyBudget;
        address registeredBy;
        uint256 anchoredAt;
        bool isActive;
    }

    // ── State Variables ──
    address public owner;
    mapping(address => bool) public admins;
    mapping(string => Agent) private agents;
    mapping(string => bool) public agentExists;
    mapping(bytes32 => PolicyAnchor) public policies;

    string[] public agentIds;

    // ── Events ──
    event AgentRegistered(string indexed id, address indexed walletAddress, AgentRole role, uint256 timestamp);
    event AgentStatusUpdated(string indexed id, AgentStatus newStatus, uint256 timestamp);
    event AgentMetadataUpdated(string indexed id, string metadataURI, bytes32 capabilitiesHash, uint256 timestamp);
    event PolicyHashAnchored(bytes32 indexed policyId, bytes32 policyHash, uint256 maxAmountPerTx, uint256 maxDailyBudget, uint256 timestamp);
    event AdminUpdated(address indexed admin, bool isAuthorized);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ── Modifiers ──
    modifier onlyOwner() {
        require(msg.sender == owner, "AgentPolicyRegistry: caller is not the owner");
        _;
    }

    modifier onlyAdminOrOwner() {
        require(msg.sender == owner || admins[msg.sender], "AgentPolicyRegistry: caller is not admin or owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        admins[msg.sender] = true;
    }

    // ── Access Control ──
    function setAdmin(address admin, bool authorized) external onlyOwner {
        require(admin != address(0), "AgentPolicyRegistry: invalid admin address");
        admins[admin] = authorized;
        emit AdminUpdated(admin, authorized);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "AgentPolicyRegistry: new owner is zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
        admins[newOwner] = true;
    }

    // ── Agent Management ──

    /**
     * @notice Register a new autonomous agent on HSK Chain.
     * @param id Unique agent identifier string.
     * @param walletAddress Operational wallet address for the agent.
     * @param role AgentRole (BUYER, PROVIDER, PAYMENT).
     * @param capabilitiesHash Cryptographic digest of supported capabilities.
     * @param metadataURI Off-chain metadata URI (e.g., IPFS or HTTPS).
     */
    function registerAgent(
        string calldata id,
        address walletAddress,
        AgentRole role,
        bytes32 capabilitiesHash,
        string calldata metadataURI
    ) external onlyAdminOrOwner {
        require(bytes(id).length > 0, "AgentPolicyRegistry: agent ID cannot be empty");
        require(!agentExists[id], "AgentPolicyRegistry: agent already registered");
        require(walletAddress != address(0), "AgentPolicyRegistry: invalid wallet address");

        agents[id] = Agent({
            id: id,
            walletAddress: walletAddress,
            role: role,
            status: AgentStatus.ACTIVE,
            capabilitiesHash: capabilitiesHash,
            metadataURI: metadataURI,
            registeredAt: block.timestamp,
            updatedAt: block.timestamp
        });

        agentExists[id] = true;
        agentIds.push(id);

        emit AgentRegistered(id, walletAddress, role, block.timestamp);
    }

    /**
     * @notice Update agent operational status (ACTIVE, INACTIVE, SUSPENDED).
     */
    function setAgentStatus(string calldata id, AgentStatus newStatus) external onlyAdminOrOwner {
        require(agentExists[id], "AgentPolicyRegistry: agent does not exist");
        agents[id].status = newStatus;
        agents[id].updatedAt = block.timestamp;

        emit AgentStatusUpdated(id, newStatus, block.timestamp);
    }

    /**
     * @notice Update agent capabilities hash and metadata URI.
     */
    function updateAgentMetadata(
        string calldata id,
        bytes32 capabilitiesHash,
        string calldata metadataURI
    ) external {
        require(agentExists[id], "AgentPolicyRegistry: agent does not exist");
        require(
            msg.sender == owner || admins[msg.sender] || msg.sender == agents[id].walletAddress,
            "AgentPolicyRegistry: unauthorized to update agent metadata"
        );

        agents[id].capabilitiesHash = capabilitiesHash;
        agents[id].metadataURI = metadataURI;
        agents[id].updatedAt = block.timestamp;

        emit AgentMetadataUpdated(id, metadataURI, capabilitiesHash, block.timestamp);
    }

    /**
     * @notice Retrieve full agent profile.
     */
    function getAgent(string calldata id) external view returns (Agent memory) {
        require(agentExists[id], "AgentPolicyRegistry: agent does not exist");
        return agents[id];
    }

    /**
     * @notice Return total count of registered agents.
     */
    function totalAgents() external view returns (uint256) {
        return agentIds.length;
    }

    // ── Policy Hash Anchoring ──

    /**
     * @notice Anchor an off-chain spending policy commitment hash on HSK Chain.
     * @param policyId Unique identifier for the spending policy.
     * @param policyHash Keccak-256 hash of the deterministic policy JSON rules.
     * @param maxAmountPerTx Maximum allowed transaction amount ceiling.
     * @param maxDailyBudget Cumulative 24-hour spending limit.
     */
    function anchorPolicyHash(
        bytes32 policyId,
        bytes32 policyHash,
        uint256 maxAmountPerTx,
        uint256 maxDailyBudget
    ) external onlyAdminOrOwner {
        require(policyId != bytes32(0), "AgentPolicyRegistry: invalid policyId");
        require(policyHash != bytes32(0), "AgentPolicyRegistry: invalid policyHash");
        require(maxAmountPerTx > 0, "AgentPolicyRegistry: max amount must be > 0");
        require(maxDailyBudget >= maxAmountPerTx, "AgentPolicyRegistry: daily budget must be >= maxAmountPerTx");

        policies[policyId] = PolicyAnchor({
            policyId: policyId,
            policyHash: policyHash,
            maxAmountPerTx: maxAmountPerTx,
            maxDailyBudget: maxDailyBudget,
            registeredBy: msg.sender,
            anchoredAt: block.timestamp,
            isActive: true
        });

        emit PolicyHashAnchored(policyId, policyHash, maxAmountPerTx, maxDailyBudget, block.timestamp);
    }

    /**
     * @notice Verify if an off-chain policy hash matches the anchored commitment on HSK Chain.
     */
    function verifyPolicyHash(bytes32 policyId, bytes32 expectedHash) external view returns (bool) {
        PolicyAnchor memory p = policies[policyId];
        return p.isActive && p.policyHash == expectedHash;
    }
}
