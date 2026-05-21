// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PredictionRegistry {
    struct Prediction {
        address pundit;
        string matchId;
        uint8 predictedOutcome; // 0: Home Win, 1: Draw, 2: Away Win
        uint256 timestamp;
    }

    // matchId => list of all predictions
    mapping(string => Prediction[]) public matchPredictions;
    
    // matchId => pundit => predictedOutcome
    mapping(string => mapping(address => uint8)) public punditPredictionForMatch;
    
    // matchId => pundit => bool
    mapping(string => mapping(address => bool)) public hasPredicted;

    event PredictionLogged(address indexed pundit, string matchId, uint8 predictedOutcome, uint256 timestamp);

    error AlreadyPredicted();
    error PastKickoff();
    error NoPredictionFound();

    function submitPrediction(string memory _matchId, uint8 _predictedOutcome, uint256 _kickoffTime) external {
        if (hasPredicted[_matchId][msg.sender]) revert AlreadyPredicted();
        if (block.timestamp >= _kickoffTime) revert PastKickoff();

        Prediction memory newPrediction = Prediction({
            pundit: msg.sender,
            matchId: _matchId,
            predictedOutcome: _predictedOutcome,
            timestamp: block.timestamp
        });

        matchPredictions[_matchId].push(newPrediction);
        hasPredicted[_matchId][msg.sender] = true;
        punditPredictionForMatch[_matchId][msg.sender] = _predictedOutcome;

        emit PredictionLogged(msg.sender, _matchId, _predictedOutcome, block.timestamp);
    }

    // Used by the Accuracy Tracker to verify what a user picked
    function getPunditPrediction(string memory _matchId, address _pundit) external view returns (uint8) {
        if (!hasPredicted[_matchId][_pundit]) revert NoPredictionFound();
        return punditPredictionForMatch[_matchId][_pundit];
    }

    function getPredictionsForMatch(string memory _matchId) external view returns (Prediction[] memory) {
        return matchPredictions[_matchId];
    }
}