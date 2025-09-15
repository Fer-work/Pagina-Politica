// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title VotingReputation Smart Contract
 * @dev Manages e-voting and reputation system for PoliticaMex
 */
contract VotingReputation is ReentrancyGuard, AccessControl {
    using ECDSA for bytes32;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");

    struct Election {
        uint256 id;
        string name;
        uint256 startTime;
        uint256 endTime;
        bool active;
        mapping(address => bool) hasVoted;
        mapping(uint256 => uint256) candidateVotes;
        uint256[] candidateIds;
    }

    struct Official {
        uint256 id;
        string name;
        string position;
        address walletAddress;
        uint256 totalRatings;
        uint256 sumRatings;
        uint256 reputationScore; // 0-1000
        bool isActive;
    }

    struct CorruptionReport {
        uint256 id;
        uint256 officialId;
        address reporter;
        string evidenceHash; // IPFS hash
        uint256 timestamp;
        uint256 communityVotes;
        uint256 verificationScore;
        bool isVerified;
        bool isResolved;
    }

    struct Citizen {
        address wallet;
        string curpHash; // Hashed CURP for privacy
        uint256 reputationPoints;
        uint256 verificationLevel; // 0=basic, 1=verified, 2=trusted, 3=guardian
        bool isRegistered;
        uint256 totalVotes;
        uint256 correctVerifications;
    }

    // State variables
    mapping(uint256 => Election) public elections;
    mapping(uint256 => Official) public officials;
    mapping(uint256 => CorruptionReport) public corruptionReports;
    mapping(address => Citizen) public citizens;

    uint256 public electionCounter;
    uint256 public officialCounter;
    uint256 public reportCounter;

    // Events
    event ElectionCreated(uint256 indexed electionId, string name);
    event VoteCast(uint256 indexed electionId, address indexed voter, uint256 candidateId);
    event ReputationUpdated(uint256 indexed officialId, uint256 newScore);
    event CorruptionReported(uint256 indexed reportId, uint256 officialId, address reporter);
    event ReportVerified(uint256 indexed reportId, bool isValid);
    event CitizenRegistered(address indexed citizen, uint256 verificationLevel);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    // Election Management
    function createElection(
        string memory _name,
        uint256 _startTime,
        uint256 _endTime,
        uint256[] memory _candidateIds
    ) external onlyRole(ADMIN_ROLE) {
        require(_startTime > block.timestamp, "Start time must be in future");
        require(_endTime > _startTime, "End time must be after start time");

        electionCounter++;
        Election storage election = elections[electionCounter];
        election.id = electionCounter;
        election.name = _name;
        election.startTime = _startTime;
        election.endTime = _endTime;
        election.active = true;
        election.candidateIds = _candidateIds;

        emit ElectionCreated(electionCounter, _name);
    }

    function castVote(
        uint256 _electionId,
        uint256 _candidateId,
        bytes memory _zkProof
    ) external nonReentrant {
        Election storage election = elections[_electionId];
        require(election.active, "Election not active");
        require(block.timestamp >= election.startTime, "Election not started");
        require(block.timestamp <= election.endTime, "Election ended");
        require(!election.hasVoted[msg.sender], "Already voted");
        require(citizens[msg.sender].isRegistered, "Citizen not registered");

        // Verify ZK-proof (simplified for demo)
        require(_verifyZKProof(_zkProof, msg.sender, _candidateId), "Invalid proof");

        election.hasVoted[msg.sender] = true;
        election.candidateVotes[_candidateId]++;
        citizens[msg.sender].totalVotes++;

        // Award reputation points for voting
        citizens[msg.sender].reputationPoints += 10;

        emit VoteCast(_electionId, msg.sender, _candidateId);
    }

    // Reputation System
    function rateOfficial(
        uint256 _officialId,
        uint256 _rating,
        string memory _evidenceHash
    ) external {
        require(_rating >= 1 && _rating <= 5, "Rating must be 1-5");
        require(citizens[msg.sender].isRegistered, "Must be registered citizen");
        require(officials[_officialId].isActive, "Official not active");

        Official storage official = officials[_officialId];
        official.totalRatings++;
        official.sumRatings += _rating;

        // Calculate weighted reputation (higher citizen reputation = more weight)
        uint256 weight = citizens[msg.sender].reputationPoints / 100 + 1;
        official.reputationScore = (official.sumRatings * 200) / official.totalRatings;

        // Award points to citizen
        citizens[msg.sender].reputationPoints += 5;

        emit ReputationUpdated(_officialId, official.reputationScore);
    }

    // Corruption Reporting
    function reportCorruption(
        uint256 _officialId,
        string memory _evidenceHash
    ) external {
        require(citizens[msg.sender].isRegistered, "Must be registered");
        require(officials[_officialId].isActive, "Official not active");

        reportCounter++;
        CorruptionReport storage report = corruptionReports[reportCounter];
        report.id = reportCounter;
        report.officialId = _officialId;
        report.reporter = msg.sender;
        report.evidenceHash = _evidenceHash;
        report.timestamp = block.timestamp;

        emit CorruptionReported(reportCounter, _officialId, msg.sender);
    }

    function verifyCorruptionReport(
        uint256 _reportId,
        bool _isValid
    ) external {
        require(citizens[msg.sender].verificationLevel >= 2, "Insufficient verification level");

        CorruptionReport storage report = corruptionReports[_reportId];
        require(!report.isVerified, "Already verified");

        report.communityVotes++;
        if (_isValid) {
            report.verificationScore++;
        }

        // If enough verifications, mark as verified
        if (report.communityVotes >= 3 && report.verificationScore >= 2) {
            report.isVerified = true;

            // Penalize official reputation
            Official storage official = officials[report.officialId];
            if (official.reputationScore >= 100) {
                official.reputationScore -= 100;
            }

            // Reward reporter and verifiers
            citizens[report.reporter].reputationPoints += 50;
            citizens[msg.sender].reputationPoints += 20;
            citizens[msg.sender].correctVerifications++;

            emit ReportVerified(_reportId, true);
        }
    }

    // Citizen Management
    function registerCitizen(
        string memory _curpHash,
        uint256 _verificationLevel
    ) external {
        require(!citizens[msg.sender].isRegistered, "Already registered");
        require(_verificationLevel <= 3, "Invalid verification level");

        citizens[msg.sender] = Citizen({
            wallet: msg.sender,
            curpHash: _curpHash,
            reputationPoints: 100, // Starting points
            verificationLevel: _verificationLevel,
            isRegistered: true,
            totalVotes: 0,
            correctVerifications: 0
        });

        emit CitizenRegistered(msg.sender, _verificationLevel);
    }

    function promoteVerificationLevel(address _citizen) external onlyRole(VALIDATOR_ROLE) {
        require(citizens[_citizen].isRegistered, "Citizen not registered");
        require(citizens[_citizen].verificationLevel < 3, "Already max level");

        citizens[_citizen].verificationLevel++;
    }

    // Admin Functions
    function addOfficial(
        string memory _name,
        string memory _position,
        address _walletAddress
    ) external onlyRole(ADMIN_ROLE) {
        officialCounter++;
        officials[officialCounter] = Official({
            id: officialCounter,
            name: _name,
            position: _position,
            walletAddress: _walletAddress,
            totalRatings: 0,
            sumRatings: 0,
            reputationScore: 500, // Start at neutral
            isActive: true
        });
    }

    // View Functions
    function getElectionResults(uint256 _electionId) external view returns (uint256[] memory, uint256[] memory) {
        Election storage election = elections[_electionId];
        uint256[] memory candidateIds = election.candidateIds;
        uint256[] memory votes = new uint256[](candidateIds.length);

        for (uint256 i = 0; i < candidateIds.length; i++) {
            votes[i] = election.candidateVotes[candidateIds[i]];
        }

        return (candidateIds, votes);
    }

    function getOfficialReputation(uint256 _officialId) external view returns (uint256, uint256, uint256) {
        Official storage official = officials[_officialId];
        return (official.reputationScore, official.totalRatings, official.sumRatings);
    }

    function getCitizenReputation(address _citizen) external view returns (uint256, uint256) {
        Citizen storage citizen = citizens[_citizen];
        return (citizen.reputationPoints, citizen.verificationLevel);
    }

    // Private Functions
    function _verifyZKProof(
        bytes memory _proof,
        address _voter,
        uint256 _candidateId
    ) private pure returns (bool) {
        // Simplified ZK-proof verification
        // In production, use proper ZK-SNARK verification
        return _proof.length > 0;
    }

    // Emergency Functions
    function pauseElection(uint256 _electionId) external onlyRole(ADMIN_ROLE) {
        elections[_electionId].active = false;
    }

    function deactivateOfficial(uint256 _officialId) external onlyRole(ADMIN_ROLE) {
        officials[_officialId].isActive = false;
    }
}