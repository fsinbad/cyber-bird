# 🐦 Crypto Flappy Bird

A Web3 Flappy Bird game where players earn real cryptocurrency tokens by playing! Collect $ORBS tokens, unlock NFT bird skins, and experience the future of play-to-earn gaming.

## 🎮 Game Features

- **Play-to-Earn**: Earn $ORBS tokens for every coin you collect
- **NFT Bird Skins**: Own unique bird characters as NFTs
- **Power-ups**: Speed boost, shield, magnet, and slow-motion abilities
- **Special Coins**: Multiplier coins (2x, 5x) for bigger rewards
- **Cyberpunk Aesthetics**: Futuristic design with neon effects and animations
- **Real-time Rewards**: Tokens sent directly to your wallet

## 🪙 How Rewards Work

### NFT Bird Collection
- **Neon Ronin**: Cyberpunk warrior bird
- **Circuitwing**: Tech-enhanced flying machine
- **Chainlord**: Blockchain-powered avian
- **Orb Sentinel**: Mystical energy guardian
- **Default Bird**: Classic cyberpunk design

## 🎯 How to Play

1. **Connect Wallet**: Link your Web3 wallet to start
2. **Fly**: Press SPACE to make your bird jump
3. **Collect**: Gather coins and avoid cyberpunk barriers
4. **Earn**: Watch your $ORBS balance grow in real-time
5. **Shop**: Spend $ORBS to unlock new bird skins and power-ups

## 🚀 Game Mechanics

## 🛒 CyberShop

Spend your hard-earned $ORBS to unlock amazing content:

### Bird Skins
- **Neon Ronin**: 30 $ORBS - Cyberpunk warrior bird
- **Circuitwing**: 40 $ORBS - Tech-enhanced flying machine  
- **Chainlord**: 50 $ORBS - Blockchain-powered avian
- **Orb Sentinel**: 20 $ORBS - Mystical energy guardian

### Power-ups
- **SLOWMO**: 10 $ORBS - Slow down time for 5 seconds
- **SHIELD**: 10 $ORBS - Protection from all collisions for 5 seconds

## 🎨 NFT Bird Skins

Each bird NFT has unique characteristics:
- **Visual Design**: Distinct cyberpunk aesthetic
- **Ownership**: True ownership on the blockchain
- **Purchasable**: Buy with $ORBS earned through gameplay

## 💰 Token Economics

### $ORBS Token
- **Utility**: In-game currency earned through gameplay
- **Distribution**: Automatic rewards for coin collection
- **Transparency**: All transactions recorded on-chain

### Reward System
- **Instant Payouts**: No waiting, rewards sent immediately
- **Fair Distribution**: Based on actual gameplay performance

## 🌟 Why Play?

- **True Ownership**: Your NFT birds are yours forever
- **Fair Rewards**: Transparent, performance-based token distribution
- **Web3 Native**: Built for the decentralized future

## ⚡ Powered by thirdweb API

This game is built on the powerful thirdweb infrastructure for seamless Web3 integration:

### Authentication & Wallet Management
- **Email Authentication**: Simple login without complex wallet setup
- **Wallet Integration**: Automatic wallet creation and management
- **Session Management**: Secure user sessions with JWT tokens

### Smart Contract Integration
- **Token Contract**: ERC-20 $ORBS token on Base Sepolia testnet
- **NFT Contract**: Bird skin NFTs for unique character ownership
- **Automatic Distribution**: Real-time token rewards sent to player wallets

### thirdweb API Endpoints Used
- **`/v1/wallets/me`**: Get user wallet address and details
- **`/v1/contracts/write`**: Mint $ORBS tokens to player wallets
- **`/v1/transactions`**: Execute NFT purchases and token approvals


### Blockchain Features
- **Base Sepolia Testnet**: Fast, low-cost transactions
- **Real-time Balance Updates**: Live token balance tracking
- **Gasless Transactions**: Seamless user experience

**Experience the future of gaming - where every jump earns you real rewards!** 🚀

---

## 🏗️ Build Your Own Web3 Game

Want to create your own Web3 gaming project with integrated reward systems? This repository includes comprehensive development guidelines to help you build similar projects from scratch.

### 📋 Development Guide: AGENTS.md

The [`AGENTS.md`](./AGENTS.md) file contains detailed, implementation-agnostic directives for building Web3 gaming platforms with reward systems using the Thirdweb API. This guide is designed for AI coding agents and developers who want to understand the architecture patterns used in this project.

#### 🎯 What You'll Learn

**Core Architecture Patterns:**
- **User Authentication System** - Email-based auth with automatic wallet creation
- **Digital Asset Purchasing** - Complete marketplace implementation with ERC-20 payments
- **Reward Distribution Engine** - Server-side validation and real-time token minting
- **Transaction Management** - Batched operations and gas optimization
- **Session Management** - Secure cookie-based sessions with CSRF protection

**Thirdweb API Integration:**
- **Authentication Endpoints** - `/v1/auth/initiate`, `/v1/auth/complete`, `/v1/wallets/me`
- **Contract Interaction** - `/v1/contracts/read`, `/v1/contracts/write`
- **Transaction Handling** - `/v1/transactions` for complex operations
- **Asset Management** - `/v1/wallets/tokens`, `/v1/wallets/nfts`

#### 🛠️ Technology Stack Flexibility

The guide is **framework-agnostic** and provides patterns that work with:

- **Frontend**: React, Vue, Svelte, Angular, or vanilla JavaScript
- **Backend**: Next.js, Express, FastAPI, Flask, Go, Rust, or any API framework
- **Database**: PostgreSQL, MongoDB, SQLite, Redis, or your preferred storage solution
- **Blockchain**: Any EVM-compatible network supported by Thirdweb

#### 🚀 Implementation Timeline

The guide includes an 8-week development roadmap:

1. **Weeks 1-2**: Foundation setup and authentication
2. **Weeks 3-4**: Core features and reward system
3. **Weeks 5-6**: Advanced features and optimization
4. **Weeks 7-8**: Polish and production deployment

#### 📚 Key Sections

- **Environment Configuration** - Required variables and setup
- **Security Best Practices** - CSRF protection, session management, input validation
- **Game Economics Design** - Token economy structure and reward calculations
- **Performance Optimization** - Blockchain interaction patterns and UX improvements
- **Monitoring & Analytics** - Key metrics and implementation strategies

#### 🎮 Perfect For

- **Game Developers** wanting to add Web3 functionality
- **Web3 Developers** building their first gaming project  
- **AI Coding Agents** generating similar projects
- **Learning Projects** understanding Web3 gaming architecture
- **Hackathon Teams** needing a solid foundation quickly

### 🔗 Additional Resources

- **Setup Instructions**: See [`SETUP.md`](./SETUP.md) for local development
- **Live Demo**: [Play the game](https://your-demo-url.com) (replace with actual URL)
- **Thirdweb Documentation**: [Official API Reference](https://portal.thirdweb.com/)

Start building the future of gaming with Web3 rewards! 🎯
