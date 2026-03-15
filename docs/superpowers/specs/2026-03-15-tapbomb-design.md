# TAPBOMB — CS2 Tap-to-Earn Game Design

## Overview
Tap-to-Earn game with CS:GO 2 theme. Player taps a C4 bomb to earn $BOMB tokens. Built as a Telegram Mini App (TWA) with crypto integration.

## Core Mechanics

### Tap System
- 1 tap = 1 $BOMB (base, scaled by multiplier)
- Energy: 1000 max, costs 1 per tap, regens 1/sec
- Combo: 10+ rapid taps = growing multiplier
- Defuse Bonus: every 100 taps, 5-sec mini-game for x10 reward

### Multipliers (purchased)
- x1 (free) → x2 (2K) → x5 (10K) → x10 (50K) → x50 (500K)

### Passive Income
- Skins generate $/hour offline
- Max offline accumulation: 4 hours

### Referrals
- 10% of referred friend earnings
- Referral leaderboard

### Seasons
- 30-day cycles with unique quests
- Season leaderboard with tiered prizes
- Season pass (free + premium track)

## Screens

### 1. Home (Main Tap Screen)
- Header: game logo + $BOMB balance
- Subheader: username + level
- Center: C4 bomb (tap target) with tap animations (+1 floating numbers)
- Below bomb: energy bar + boost multiplier display
- Bottom nav: 5 tabs

### 2. Quests
- Daily quests (3 per day)
- Achievements (lifetime milestones)
- Season quests (30-day objectives)
- Quest rewards in $BOMB

### 3. Profile
- Player stats (total taps, earnings, playtime)
- Leaderboard (global + friends)
- Referral program (link + stats)
- Settings

### 4. Web
- External link to project website
- Roadmap, tokenomics, social links

### 5. Shop
- Boosts: Energy Refill, Multiplier, Auto-Tap, Energy Max upgrade
- Skins: Visual + stat bonuses for the bomb
- Each skin has rarity tier (Common → Legendary → Mythic)

## Visual Style
- Dark theme (#0a0a0f base)
- CS2 HUD aesthetic
- Orange (#ff6600) + cyan (#00d4ff) accent colors
- Monospace/tactical fonts
- Particle effects on tap
- Screen shake on combo milestones

## Tech Stack
- HTML/CSS/JS single-page prototype
- Telegram Mini App compatible
- Local storage for game state
- CSS animations + Canvas for effects

## Tokenomics Summary
- Total supply: 1B $BOMB
- Tap mining: 40%
- Season rewards: 20%
- Referrals: 10%
- Team: 15%
- Liquidity: 15%
