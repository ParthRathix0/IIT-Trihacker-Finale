#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   AEGIS V3 - GAS COST ANALYSIS        ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${YELLOW}Running tests to extract gas metrics...${NC}"
echo ""

# Run tests and extract gas table
yarn test 2>&1 | grep -A 30 "Methods"

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}AMORTIZED COST ANALYSIS${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "${YELLOW}Direct User Costs:${NC}"
echo -e "  - Deposit:  ~152,315 gas"
echo -e "  - Claim:    ~63,769 gas"
echo -e "  - ${GREEN}User Total: ~216,084 gas${NC}"
echo ""
echo -e "${YELLOW}Shared Batch Costs (amortized):${NC}"
echo -e "  - Oracle Collection (3x): ~1,213,575 gas"
echo -e "  - Phase Transitions:      ~784,845 gas"
echo -e "  - ${GREEN}Shared Total: ~1,998,420 gas${NC}"
echo ""
echo -e "${CYAN}----------------------------------------${NC}"
echo -e "${YELLOW}Cost per User at Different Batch Sizes:${NC}"
echo ""
printf "${CYAN}%-15s %-20s %-15s${NC}\n" "Batch Size" "Gas per User" "USD @ 15 gwei"
echo -e "${CYAN}----------------------------------------${NC}"
printf "%-15s %-20s %-15s\n" "2 users" "1,215,294 gas" "\$0.069"
printf "%-15s %-20s %-15s\n" "10 users" "415,926 gas" "\$0.024"
printf "%-15s %-20s %-15s\n" "50 users" "256,052 gas" "\$0.015"
printf "%-15s %-20s %-15s\n" "100 users" "236,068 gas" "\$0.013"
printf "%-15s %-20s %-15s\n" "500 users" "220,081 gas" "\$0.012"
printf "${GREEN}%-15s %-20s %-15s${NC}\n" "1000 users" "218,082 gas" "\$0.012"
echo ""
echo -e "${CYAN}----------------------------------------${NC}"
echo -e "${YELLOW}Comparison:${NC}"
echo -e "  - Uniswap V3 Swap:     ~200,000 gas (no oracle security)"
echo -e "  - ${GREEN}Aegis @ 100 users:    ~236,000 gas (5-oracle consensus)${NC}"
echo -e "  - ${GREEN}Premium for Security:  +18% gas for full protection${NC}"
echo ""
echo -e "${CYAN}========================================${NC}"
echo ""
