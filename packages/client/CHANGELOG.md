# Changelog


## [0.3.x] 

### Added - 2025-05-23
- Coin Manager improvements:
  - Implemented pagination for coin fetching to support wallets with large number of coins

### Added - 2025-05-22
- Bulk Transfer module improvements:
  - Added validation to prevent negative transfer amounts
  - Added real-time Sui address validation with visual feedback
- Coin Manager improvements:
  - Added coin icons display for better visual identification
  - Special handling for SUI coin with dedicated icon
  - Fallback display for coins without icon metadata


## [0.3.0] - 2025-05-16

### Added
  - Display coin values based on real-time price data
  - Burn functionality for individual coins and batch operations
  - Low value coin identification and batch burning

## [0.2.0] - 2025-05-11

### Added
- Coin Manager module:
  - View all coin types and their objects in your wallet
  - Batch merge same-type coin objects (including SUI and other tokens)
  - Batch clean zero-balance coin objects
  - Merge or clean zero-balance for a single coin type