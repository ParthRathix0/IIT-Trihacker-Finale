#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

clear
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  AEGIS V3 - DEMO CHEATSHEET          ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${CYAN}Available Demo Scripts:${NC}"
echo ""
echo -e "${GREEN}1. Interactive Menu (RECOMMENDED)${NC}"
echo "   ./scripts/judge-demo.sh"
echo ""
echo -e "${GREEN}2. Run Tests Only${NC}"
echo "   ./scripts/run-tests.sh"
echo ""
echo -e "${GREEN}3. Show Gas Costs${NC}"
echo "   ./scripts/show-gas-costs.sh"
echo ""
echo -e "${GREEN}4. Verify Sepolia Deployment${NC}"
echo "   npx hardhat run scripts/testnet-demo.ts --network sepolia"
echo ""
echo -e "${CYAN}----------------------------------------${NC}"
echo -e "${CYAN}Quick Results Summary:${NC}"
echo ""
echo "- Tests: 4/4 passing (~1 second)"
echo "- Settlement: \$2018 from 5 oracles"
echo "- Weights: All updated (110, 110, 109, 109, 109)"
echo "- Gas @ 100 users: ~236k (vs Uniswap 200k)"
echo "- Sepolia: 6 contracts live and verified"
echo ""
echo -e "${BLUE}========================================${NC}"
echo ""
