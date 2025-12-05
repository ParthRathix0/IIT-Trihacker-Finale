// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

library AegisMath {
    uint256 constant PRECISION = 1e18;

    //Ensures Fair ordering.Doesn't take array of users. Takes Total Volume.
    function calculateFillRates(uint256 buyVol, uint256 sellVol, uint256 price) 
        internal 
        pure 
        returns (uint256 bRate, uint256 sRate) 
    {
        if (buyVol == 0 || sellVol == 0) return (0, 0);
        
        // Convert Sell Volume to Buy Currency Value (ETH -> USD)
        // Assumption: price is scaled to 1e18
        uint256 sellValue = (sellVol * price) / PRECISION; 
        uint256 buyValue = buyVol; 

        if (buyValue >= sellValue) {
            sRate = PRECISION; // Sellers filled 100%
            bRate = (sellValue * PRECISION) / buyValue; 
        } else {
            bRate = PRECISION; // Buyers filled 100%
            sRate = (buyValue * PRECISION) / sellValue; 
        }
    }
}