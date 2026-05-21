// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

// Interface to interact with our Registry contract
interface IPredictionRegistry {
    function getPunditPrediction(string memory _matchId, address _pundit) external view returns (uint8);
    function hasPredicted(string memory _matchId, address _pundit) external view returns (bool);
}

contract AccuracyTracker is Ownable {
    IPredictionRegistry public registry;

    struct PunditStats {
        uint256 wins;
        uint256 losses;
        uint256 totalResolved;
    }

    // pundit address => lifetime stats
    mapping(address => PunditStats) public stats;
    
    // matchId => actualOutcome (0: Home, 1: Draw, 2: Away)
    mapping(string => uint8) public matchOutcomes;
    mapping(string => bool) public matchResolved;
    
    // mapping to prevent grading a pundit twice for the same match
    mapping(string => mapping(address => bool)) public punditGradedForMatch;

    event MatchResolved(string matchId, uint8 outcome);
    event PunditGraded(address indexed pundit, string matchId, bool won);

    constructor(address _registryAddress) Ownable(msg.sender) {
        registry = IPredictionRegistry(_registryAddress);
    }

    /**
     * @dev Called by your off-chain Oracle worker when the game ends.
     */
    function resolveMatch(string memory _matchId, uint8 _actualOutcome) external onlyOwner {
        require(!matchResolved[_matchId], "Match already resolved");
        matchOutcomes[_matchId] = _actualOutcome;
        matchResolved[_matchId] = true;
        emit MatchResolved(_matchId, _actualOutcome);
    }

    /**
     * @dev Pundits (or a backend bot) call this to update their score after a match is resolved.
     */
    function gradePundit(string memory _matchId, address _pundit) external {
        require(matchResolved[_matchId], "Match not resolved yet");
        require(registry.hasPredicted(_matchId, _pundit), "Pundit did not predict this match");
        require(!punditGradedForMatch[_matchId][_pundit], "Pundit already graded");

        uint8 predicted = registry.getPunditPrediction(_matchId, _pundit);
        uint8 actual = matchOutcomes[_matchId];

        punditGradedForMatch[_matchId][_pundit] = true;
        stats[_pundit].totalResolved += 1;

        bool won = (predicted == actual);
        if (won) {
            stats[_pundit].wins += 1;
        } else {
            stats[_pundit].losses += 1;
        }

        emit PunditGraded(_pundit, _matchId, won);
    }

    // Returns a win percentage scaled by 100 (e.g., 7500 = 75.00%)
    function getAccuracy(address _pundit) external view returns (uint256) {
        if (stats[_pundit].totalResolved == 0) return 0;
        return (stats[_pundit].wins * 10000) / stats[_pundit].totalResolved;
    }
}