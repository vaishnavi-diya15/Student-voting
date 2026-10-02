// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Voting {
    address public immutable votingAuthority;
    bool public electionActive;

    bytes32[] private candidateIds;
    mapping(bytes32 => bool) public candidateRegistered;
    mapping(bytes32 => uint256) private voteCounts;
    mapping(bytes32 => bool) private usedVoterNullifiers;

    event ElectionStatusChanged(bool active);
    event CandidateRegistered(bytes32 indexed candidateId);
    event VoteCast(bytes32 indexed candidateId, uint256 newVoteCount);

    modifier onlyVotingAuthority() {
        require(msg.sender == votingAuthority, "Voting: caller is not authority");
        _;
    }

    constructor(address authority) {
        require(authority != address(0), "Voting: authority is zero address");
        votingAuthority = authority;
    }

    function setElectionActive(bool active) external onlyVotingAuthority {
        if (active) {
            require(candidateIds.length > 0, "Voting: register a candidate first");
        }
        electionActive = active;
        emit ElectionStatusChanged(active);
    }

    function registerCandidate(bytes32 candidateId) external onlyVotingAuthority {
        require(!electionActive, "Voting: election is active");
        require(candidateId != bytes32(0), "Voting: candidate id is empty");
        require(!candidateRegistered[candidateId], "Voting: candidate already registered");

        candidateRegistered[candidateId] = true;
        candidateIds.push(candidateId);
        emit CandidateRegistered(candidateId);
    }

    function castVote(bytes32 voterNullifier, bytes32 candidateId) external onlyVotingAuthority {
        require(electionActive, "Voting: election is inactive");
        require(voterNullifier != bytes32(0), "Voting: nullifier is empty");
        require(candidateRegistered[candidateId], "Voting: invalid candidate");
        require(!usedVoterNullifiers[voterNullifier], "Voting: nullifier already used");

        usedVoterNullifiers[voterNullifier] = true;
        voteCounts[candidateId] += 1;
        emit VoteCast(candidateId, voteCounts[candidateId]);
    }

    function getCandidateCount() external view returns (uint256) {
        return candidateIds.length;
    }

    function getVoteCount(bytes32 candidateId) external view returns (uint256) {
        require(candidateRegistered[candidateId], "Voting: invalid candidate");
        return voteCounts[candidateId];
    }

    function getResults()
        external
        view
        returns (bytes32[] memory registeredCandidateIds, uint256[] memory counts)
    {
        uint256 length = candidateIds.length;
        registeredCandidateIds = new bytes32[](length);
        counts = new uint256[](length);

        for (uint256 i = 0; i < length; i++) {
            bytes32 candidateId = candidateIds[i];
            registeredCandidateIds[i] = candidateId;
            counts[i] = voteCounts[candidateId];
        }
    }
}