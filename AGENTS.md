# AGENTS.md - Game-Based Reward System Development Guide

## Project Overview

This document provides high-level directives for creating a Web3 gaming platform with an integrated reward system using the Thirdweb API. The architecture described here can be adapted to any technology stack while maintaining the core Web3 functionality patterns.

## System Architecture

### Core Components

1. **Frontend Game Interface** - Interactive game client with real-time gameplay
2. **Authentication System** - Web3 wallet management and user sessions  
3. **Reward Engine** - Token distribution and game economics
4. **Transaction Management** - Blockchain interaction and state management
5. **Asset Management** - NFT and token inventory system

## Thirdweb API Integration Patterns

The app uses several thirdweb API v1 endpoints organized by functionality:

> **📚 Complete API Reference**: For full thirdweb API documentation, see [thirdweb API Reference](https://api.thirdweb.com/llms.txt)

### 1. User Authentication System

#### Implementation Strategy
- Use email-based authentication for simplified user onboarding
- Implement automatic wallet creation and management behind the scenes
- Maintain secure session management with CSRF protection

#### Thirdweb API Endpoints Used
- `POST /v1/auth/initiate` - Start authentication flow with email verification
- `POST /v1/auth/complete` - Complete authentication and receive wallet credentials
- `GET /v1/wallets/me` - Retrieve authenticated user's wallet details

#### Key Directives
1. **Seamless Onboarding**: Abstract Web3 complexity from users during initial signup
2. **Session Persistence**: Implement secure local storage for user sessions with expiration
3. **Error Handling**: Provide clear feedback for authentication failures and retry mechanisms
4. **Security First**: Always validate CSRF tokens and implement proper origin checking

#### Implementation Pattern
```
Client Request → Email Input → OTP Verification → Wallet Creation → Session Storage
```

### 2. Transaction Management System

#### Implementation Strategy
- Batch related transactions for gas efficiency
- Implement transaction encoding for custom contract interactions
- Provide real-time transaction status updates to users

#### Thirdweb API Endpoints Used
- `POST /v1/transactions` - Submit encoded transactions to blockchain
- `POST /v1/contracts/write` - Execute smart contract method calls
- `POST /v1/contracts/read` - Query contract state and balances

#### Key Directives
1. **Gas Optimization**: Batch multiple operations in single transactions where possible
2. **User Experience**: Provide clear transaction status and confirmation feedback
3. **Error Recovery**: Implement retry logic for failed transactions
4. **State Synchronization**: Update local state immediately after successful transactions

#### Transaction Flow Pattern
```
User Action → Transaction Encoding → Blockchain Submission → Status Monitoring → State Update
```

### 3. Reward System Architecture

#### Implementation Strategy
- Server-side reward calculation to prevent client-side manipulation
- Real-time token distribution based on game performance
- Transparent and auditable reward mechanics

#### Thirdweb API Endpoints Used
- `POST /v1/contracts/write` - Mint reward tokens directly to user wallets
- `GET /v1/contracts/read` - Query user token balances for display
- `POST /v1/transactions` - Execute complex reward distribution logic

#### Key Directives
1. **Security First**: Always validate rewards server-side using game performance metrics
2. **Immediate Gratification**: Distribute rewards in real-time during or immediately after gameplay
3. **Transparency**: Provide clear feedback on reward calculation and distribution
4. **Scalability**: Design reward system to handle high-frequency distributions efficiently

#### Reward Distribution Pattern
```
Game Completion → Performance Analysis → Server Validation → Token Minting → Balance Update
```

### 4. Digital Asset Purchasing System

#### Implementation Strategy
- Create marketplace for purchasable NFT assets (characters, power-ups, cosmetics)
- Implement multi-step transaction flows with proper approval handling
- Provide clear pricing and ownership verification before purchases
- Handle both ERC-20 token payments and direct purchases

#### Thirdweb API Endpoints Used
- `POST /v1/contracts/read` - Check user token balances and asset ownership
- `POST /v1/contracts/write` - Execute approval and purchase transactions
- `POST /v1/transactions` - Handle batched approval + purchase operations
- `GET /v1/wallets/tokens` - Retrieve comprehensive token balances
- `GET /v1/wallets/nfts` - Query user's NFT inventory

#### Key Directives
1. **Two-Step Purchase Flow**: Always implement approve → purchase pattern for ERC-20 payments
2. **Balance Verification**: Check user balances before allowing purchase attempts
3. **Transaction Batching**: Combine approval and purchase into single user action when possible
4. **Price Transparency**: Display costs clearly in both token amounts and USD equivalents
5. **Ownership Verification**: Prevent duplicate purchases of unique assets
6. **Gas Estimation**: Provide transaction cost estimates before execution

#### Purchase Flow Patterns

**ERC-20 Token Purchase:**
```
Asset Selection → Balance Check → Price Display → Approval Transaction → Purchase Transaction → Inventory Update
```

**Direct Purchase (Native Token):**
```
Asset Selection → Balance Check → Price Display → Purchase Transaction → Inventory Update
```

**Batch Purchase:**
```
Multiple Asset Selection → Total Cost Calculation → Batch Approval → Batch Purchase → Bulk Inventory Update
```

#### Purchase Implementation Guidelines
1. **Pre-Purchase Validation**: Always verify sufficient balance and asset availability
2. **Progressive Loading**: Show transaction status for each step in multi-step flows
3. **Error Recovery**: Provide clear retry mechanisms for failed transactions
4. **Receipt Generation**: Create transaction receipts with asset details and hashes
5. **Inventory Sync**: Immediately update local state after successful purchases

### 5. Asset Management and NFT System

#### Implementation Strategy
- Real-time inventory management and balance tracking
- Asset utility integration with gameplay mechanics
- Transfer and trading capabilities (if desired)
- Asset metadata and visual representation

#### Thirdweb API Endpoints Used
- `GET /v1/contracts/read` - Query NFT ownership and metadata
- `POST /v1/contracts/read` - Batch read operations for multiple assets
- `GET /v1/wallets/nfts` - Comprehensive NFT inventory retrieval
- `POST /v1/transactions` - Handle asset transfers and burns

#### Key Directives
1. **Real-time Updates**: Keep inventory synchronized with blockchain state
2. **Asset Utility**: Integrate owned assets meaningfully into gameplay
3. **Visual Representation**: Display asset images and metadata clearly
4. **Usage Tracking**: Monitor asset usage for analytics and balancing

#### Asset Management Pattern
```
Game Launch → Inventory Fetch → Asset Display → Usage Integration → State Sync
```

## Technical Implementation Guidelines

### Environment Configuration

#### Required Environment Variables
```bash
# Thirdweb Configuration
THIRDWEB_SECRET_KEY=your_secret_key
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_client_id
THIRDWEB_API_BASE_URL=https://api.thirdweb.com

# Smart Contract Addresses
TOKEN_CONTRACT_ADDRESS=your_erc20_token_contract
NFT_CONTRACT_ADDRESS=your_erc1155_nft_contract
ADMIN_ADDRESS=your_admin_wallet_address

# Network Configuration
CHAIN_ID=your_target_chain_id

# Game Economy Settings
GAME_REWARD_BASE=minimum_reward_per_game
GAME_REWARD_MAX=maximum_reward_per_game
```

### Session Management and Security

#### Session Architecture Strategy
- Implement hybrid session management combining server-side security with client-side convenience
- Use HTTP-only cookies for sensitive authentication tokens
- Maintain separate CSRF tokens for state-changing operations
- Provide session persistence options for user convenience

#### Session Management Implementation

##### Server-Side Session Security
1. **HTTP-Only Cookie Storage**: Store authentication tokens in secure, HTTP-only cookies
2. **CSRF Token Pairing**: Generate unique CSRF tokens paired with each session
3. **Session Expiration**: Implement configurable session timeouts (recommended: 1-7 days)
4. **Token Rotation**: Periodically refresh authentication tokens for long-lived sessions
5. **Origin Validation**: Verify request origins match expected domains

##### Client-Side Session Convenience  
1. **Local Storage Persistence**: Store non-sensitive user preferences and UI state
2. **Remember Me Functionality**: Allow users to opt into extended session duration
3. **Automatic Re-authentication**: Detect expired sessions and prompt for re-authentication
4. **Session Recovery**: Gracefully handle network interruptions and session restoration

##### Session Lifecycle Management
```
Login → Token Generation → Cookie Storage → CSRF Pairing → Session Validation → Periodic Refresh → Logout/Expiry
```

#### Session Security Best Practices

##### Authentication Security
1. **CSRF Protection**: Implement CSRF tokens for all state-changing operations
2. **Secure Cookie Configuration**: Use secure, SameSite, and HTTP-only flags appropriately
3. **Origin Validation**: Verify request origins for additional security
4. **Input Validation**: Validate all user inputs server-side before processing
5. **Session Invalidation**: Immediately invalidate sessions on logout or security events

##### Token Management
1. **Token Entropy**: Use cryptographically secure random token generation
2. **Token Scope**: Limit token permissions to minimum required scope
3. **Token Storage**: Never store sensitive tokens in localStorage or sessionStorage
4. **Token Transmission**: Always transmit tokens over HTTPS in production
5. **Token Cleanup**: Implement automatic cleanup of expired tokens

##### Session Monitoring
1. **Concurrent Session Limits**: Optionally limit concurrent sessions per user
2. **Suspicious Activity Detection**: Monitor for unusual login patterns
3. **Session Analytics**: Track session duration and user engagement metrics
4. **Security Event Logging**: Log authentication failures and security events

#### Session Implementation Patterns

##### Session Establishment
```
Email Verification → Thirdweb Auth → Token Receipt → Cookie Creation → CSRF Generation → Client Notification
```

##### Session Validation
```
Request Received → Cookie Extraction → Token Validation → CSRF Verification → Origin Check → Request Processing
```

##### Session Refresh
```
Token Expiry Detection → Background Refresh → New Token Storage → UI State Preservation
```

#### Transaction Security
1. **Server-Side Validation**: Always validate transaction parameters on the server
2. **Rate Limiting**: Implement appropriate rate limits for transaction endpoints
3. **Balance Checks**: Verify user balances before executing spend transactions
4. **Error Handling**: Provide secure error messages that don't leak sensitive information
5. **Transaction Signing**: Ensure all transactions are properly signed and authorized

### Database and State Management

#### Local State Patterns
1. **Optimistic Updates**: Update UI immediately while transactions confirm
2. **Error Recovery**: Revert optimistic updates if transactions fail
3. **Cache Management**: Implement appropriate caching for blockchain data
4. **Sync Strategies**: Regularly sync local state with blockchain truth

#### Persistent Storage
1. **User Preferences**: Store non-sensitive user settings locally
2. **Game Progress**: Maintain game state separate from blockchain assets
3. **Session Data**: Securely store authentication tokens with proper expiration
4. **Cache Invalidation**: Implement strategies for cache freshness and invalidation

## Game Economics Design

### Token Economy Structure

#### Primary Token (ERC-20)
- **Purpose**: Primary in-game currency for purchases and rewards
- **Distribution**: Performance-based rewards, direct purchases, special events
- **Utility**: Asset purchases, power-up acquisitions, special features
- **Economics**: Balanced inflation through gameplay rewards and deflation through purchases

#### NFT Assets (ERC-1155)
- **Characters**: Unique playable assets with different abilities or aesthetics
- **Power-ups**: Consumable items that provide temporary gameplay advantages  
- **Collectibles**: Rare items with potential future utility or trading value
- **Achievements**: Non-transferable proof of accomplishments

### Reward Calculation Strategy

#### Performance Metrics
1. **Base Rewards**: Minimum tokens for game completion
2. **Performance Multipliers**: Additional rewards based on score, time, or achievements
3. **Streak Bonuses**: Increased rewards for consecutive play sessions
4. **Special Events**: Temporary multipliers for engagement campaigns

#### Anti-Abuse Measures
1. **Server Validation**: All reward calculations performed server-side
2. **Rate Limiting**: Prevent rapid-fire reward claiming
3. **Behavioral Analysis**: Monitor for suspicious patterns in gameplay
4. **Manual Review**: Flag unusually high reward claims for verification

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
1. Set up basic project structure with chosen framework
2. Implement Thirdweb authentication system
3. Create basic game interface and mechanics
4. Establish smart contract integration patterns

### Phase 2: Core Features (Weeks 3-4)  
1. Implement reward distribution system
2. Create asset management and NFT integration
3. Build transaction management with proper error handling
4. Add comprehensive input validation and security measures

### Phase 3: Enhancement (Weeks 5-6)
1. Optimize transaction batching and gas efficiency
2. Implement advanced game features and power-ups
3. Add comprehensive monitoring and analytics
4. Perform security audits and penetration testing

### Phase 4: Polish (Weeks 7-8)
1. Enhance user experience with loading states and feedback
2. Implement comprehensive error recovery mechanisms
3. Add social features and leaderboards
4. Prepare for production deployment and scaling

## Technology Stack Flexibility

### Frontend Framework Options
- **React/Next.js**: Recommended for full-stack development with built-in API routes
- **Vue.js/Nuxt.js**: Alternative with similar capabilities and patterns
- **Svelte/SvelteKit**: Lightweight option with excellent performance
- **Vanilla JS**: For maximum control and minimal dependencies

### Backend/API Layer Options
- **Next.js API Routes**: Integrated solution for React applications
- **Express.js**: Standalone Node.js server with full control
- **Fastify**: High-performance alternative to Express
- **Python Flask/FastAPI**: For Python-based backend development
- **Go/Rust**: For maximum performance and efficiency

### Database Options
- **PostgreSQL**: For complex relational data and analytics
- **MongoDB**: For flexible document-based storage
- **SQLite**: For simple applications with minimal setup
- **Redis**: For caching and session management
- **Local Storage/IndexedDB**: For client-side data persistence

## Performance Optimization

### Blockchain Interaction Optimization
1. **Batch Requests**: Group multiple read operations together
2. **Caching Strategy**: Cache frequently accessed blockchain data
3. **Lazy Loading**: Load blockchain data only when needed
4. **Connection Pooling**: Reuse connections for API requests

### User Experience Optimization
1. **Optimistic UI**: Update interface before blockchain confirmation
2. **Loading States**: Provide clear feedback during async operations
3. **Error Recovery**: Graceful handling of network and blockchain errors
4. **Progressive Enhancement**: Ensure basic functionality without Web3

### Game Performance
1. **Frame Rate**: Maintain consistent 60fps gameplay
2. **Memory Management**: Properly clean up game objects and listeners
3. **Asset Optimization**: Compress images and audio files
4. **Network Optimization**: Minimize API calls during active gameplay

## Monitoring and Analytics

### Key Metrics to Track
1. **User Engagement**: Session duration, return rate, game completions
2. **Economic Metrics**: Token distribution, NFT purchases, wallet balances
3. **Technical Performance**: API response times, transaction success rates
4. **Security Events**: Failed authentication attempts, suspicious activities

### Implementation Tools
1. **Application Monitoring**: Error tracking and performance monitoring
2. **Blockchain Analytics**: Transaction monitoring and wallet tracking
3. **User Analytics**: Gameplay patterns and user behavior analysis
4. **Business Intelligence**: Revenue tracking and economic health metrics

## Conclusion

This architecture provides a robust foundation for building Web3 gaming applications with integrated reward systems. The patterns described here leverage Thirdweb's infrastructure while maintaining flexibility for different technology choices and business requirements.

The key to success lies in balancing Web3 functionality with traditional gaming user experience expectations. Focus on making blockchain interactions transparent and beneficial to users while maintaining the security and decentralization benefits of Web3 technology.

Remember that this is a living document - adapt these patterns based on your specific game mechanics, target audience, and business objectives while maintaining the core principles of security, user experience, and economic sustainability.
