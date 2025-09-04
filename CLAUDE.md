# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development server**: `npm run dev` (starts Next.js dev server on localhost:3000)
- **Build**: `npm run build` (creates production build)
- **Start production**: `npm start` (runs production server)
- **Lint**: `npm run lint` (runs ESLint with Next.js config)

## Environment Setup

Copy `env.example` to `.env.local` and configure:
- `THIRDWEB_SECRET_KEY`: Server-side API key for thirdweb operations
- `TOKEN_CONTRACT_ADDRESS`: ERC-20 token contract address
- `CHAIN_ID`: Blockchain network ID (default: 84532 for Base Sepolia)
- `ADMIN_ADDRESS`: Wallet address for token minting operations

## Architecture Overview

This is a Web3 Flappy Bird game built with Next.js 14, featuring play-to-earn mechanics with thirdweb integration.

### Core Structure
- **Next.js App Router**: Uses `app/` directory structure
- **API Routes**: Authentication and blockchain operations in `app/api/`
- **Components**: Game components and UI in `components/`
- **Library**: Utility functions and configurations in `lib/`

### Key Components
- **FlappyBird** (`components/FlappyBird.tsx`): Main game engine with canvas rendering
- **AuthComponent** (`components/AuthComponent.tsx`): Handles email-based authentication
- **CyberShop** (`components/CyberShop.tsx`): In-game NFT and power-up store
- **AudioManager** (`components/AudioManager.tsx`): Game sound management

### Authentication Flow
Uses thirdweb's email authentication:
1. User enters email → `/api/auth/initiate` sends OTP
2. User verifies OTP → `/api/auth/complete` returns wallet address and session
3. Session stored in HTTP-only cookies with CSRF protection

### Token Economics
- Players earn $ORBS tokens by collecting coins in-game
- Server-side reward calculation prevents client manipulation
- Token minting via thirdweb API using admin wallet
- NFT bird skins purchasable with earned tokens

### Blockchain Integration
- **Network**: Base Sepolia testnet (chain ID: 84532)
- **Token Contract**: ERC-20 $ORBS token with minting capability
- **thirdweb API**: Handles wallet management and contract interactions
- **Authentication**: JWT tokens for API access, HTTP-only cookies for sessions

### Security Features
- Server-side reward verification in `app/api/claim-rewards/route.ts`
- CSRF token validation for all authenticated requests
- Input validation for all game statistics and amounts
- Request size limits and timestamp validation for anti-cheat

### File Organization
- `lib/env.ts`: Environment variable configuration
- `lib/thirdweb.ts`: thirdweb API wrapper functions
- `lib/validation.ts`: Input validation utilities
- `lib/types.ts`: TypeScript type definitions
- `types/window.d.ts`: Global type declarations

The codebase follows Next.js 14 App Router conventions with TypeScript, Tailwind CSS for styling, and server-side API routes for secure blockchain operations.