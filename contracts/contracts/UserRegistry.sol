// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract UserRegistry {
    mapping(address => string) private usernames;
    mapping(bytes32 => bool) private usernameTaken;

    event UserRegistered(address indexed user, string username);

    error AlreadyRegistered();
    error UsernameTaken();
    error InvalidUsername();
    error UserNotRegistered();

    function register(string calldata _username) external {
        if (bytes(usernames[msg.sender]).length != 0) revert AlreadyRegistered();
        if (!_isValidUsername(_username)) revert InvalidUsername();

        bytes32 usernameHash = keccak256(bytes(_username));
        if (usernameTaken[usernameHash]) revert UsernameTaken();

        usernames[msg.sender] = _username;
        usernameTaken[usernameHash] = true;

        emit UserRegistered(msg.sender, _username);
    }

    function hasRegistered(address _user) external view returns (bool) {
        return bytes(usernames[_user]).length != 0;
    }

    function getUsername(address _user) external view returns (string memory) {
        string memory username = usernames[_user];
        if (bytes(username).length == 0) revert UserNotRegistered();
        return username;
    }

    function _isValidUsername(string calldata _username) private pure returns (bool) {
        bytes calldata usernameBytes = bytes(_username);
        if (usernameBytes.length < 3 || usernameBytes.length > 24) return false;

        for (uint256 i = 0; i < usernameBytes.length; i++) {
            bytes1 char = usernameBytes[i];
            bool isNumber = char >= 0x30 && char <= 0x39;
            bool isUpper = char >= 0x41 && char <= 0x5A;
            bool isLower = char >= 0x61 && char <= 0x7A;
            bool isUnderscore = char == 0x5F;

            if (!(isNumber || isUpper || isLower || isUnderscore)) return false;
        }

        return true;
    }
}
