// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PunditSubscription {
    // subscriber => pundit => expiration timestamp
    mapping(address => mapping(address => uint256)) public subscriptions;
    
    // pundit => price per month (in wei)
    mapping(address => uint256) public punditMonthlyPrice;
    
    // pundit => pending balance to withdraw
    mapping(address => uint256) public balances;

    event PriceUpdated(address indexed pundit, uint256 newPrice);
    event Subscribed(address indexed subscriber, address indexed pundit, uint256 expiry);
    event FundsWithdrawn(address indexed pundit, uint256 amount);

    /**
     * @dev Pundits set their own monthly price to unlock their predictions.
     */
    function setSubscriptionPrice(uint256 _priceInWei) external {
        punditMonthlyPrice[msg.sender] = _priceInWei;
        emit PriceUpdated(msg.sender, _priceInWei);
    }

    /**
     * @dev Users pay the native token (OKB) to subscribe for 30 days.
     */
    function subscribe(address _pundit) external payable {
        uint256 price = punditMonthlyPrice[_pundit];
        require(price > 0, "Pundit is currently free or not accepting subs");
        require(msg.value >= price, "Insufficient payment");

        // 30 days = 2592000 seconds
        uint256 currentExpiry = subscriptions[msg.sender][_pundit];
        if (currentExpiry < block.timestamp) {
            subscriptions[msg.sender][_pundit] = block.timestamp + 30 days;
        } else {
            // Extend existing subscription
            subscriptions[msg.sender][_pundit] = currentExpiry + 30 days;
        }

        // Credit the pundit's internal balance
        balances[_pundit] += msg.value;

        emit Subscribed(msg.sender, _pundit, subscriptions[msg.sender][_pundit]);
    }

    /**
     * @dev Returns true if the user's subscription to the pundit is active.
     */
    function isSubscribed(address _subscriber, address _pundit) external view returns (bool) {
        return subscriptions[_subscriber][_pundit] >= block.timestamp;
    }

    /**
     * @dev Pundits call this to cash out their earnings.
     */
    function withdrawEarnings() external {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "No funds to withdraw");
        
        balances[msg.sender] = 0;
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");

        emit FundsWithdrawn(msg.sender, amount);
    }
}