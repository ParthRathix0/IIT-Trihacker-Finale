#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

clear

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  AEGIS V3 - JUDGE DEMONSTRATION       ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${CYAN}What would you like to demonstrate?${NC}"
echo ""
echo -e "  ${YELLOW}1)${NC} Run Full Test Suite (12-step lifecycle)"
echo -e "  ${YELLOW}2)${NC} Show Gas Cost Analysis (amortized costs)"
echo -e "  ${YELLOW}3)${NC} Verify Sepolia Deployment (live contracts)"
echo -e "  ${YELLOW}4)${NC} Show All (comprehensive demo)"
echo -e "  ${YELLOW}5)${NC} Exit"
echo ""
echo -ne "${CYAN}Enter your choice [1-5]: ${NC}"
read choice

case $choice in
  1)
    echo ""
    echo -e "${MAGENTA}========================================${NC}"
    echo -e "${MAGENTA}RUNNING TEST SUITE${NC}"
    echo -e "${MAGENTA}========================================${NC}"
    echo ""
    ./scripts/run-tests.sh
    ;;
  2)
    echo ""
    echo -e "${MAGENTA}========================================${NC}"
    echo -e "${MAGENTA}GAS COST ANALYSIS${NC}"
    echo -e "${MAGENTA}========================================${NC}"
    echo ""
    ./scripts/show-gas-costs.sh
    ;;
  3)
    echo ""
    echo -e "${MAGENTA}========================================${NC}"
    echo -e "${MAGENTA}SEPOLIA DEPLOYMENT VERIFICATION${NC}"
    echo -e "${MAGENTA}========================================${NC}"
    echo ""
    npx hardhat run scripts/testnet-demo.ts --network sepolia
    ;;
  4)
    echo ""
    echo -e "${MAGENTA}========================================${NC}"
    echo -e "${MAGENTA}COMPREHENSIVE DEMONSTRATION${NC}"
    echo -e "${MAGENTA}========================================${NC}"
    echo ""
    
    echo -e "${BLUE}[1/3] Testing Local Contracts...${NC}"
    ./scripts/run-tests.sh
    
    echo ""
    echo -e "${BLUE}[2/3] Analyzing Gas Costs...${NC}"
    ./scripts/show-gas-costs.sh
    
    echo ""
    echo -e "${BLUE}[3/3] Verifying Sepolia Deployment...${NC}"
    npx hardhat run scripts/testnet-demo.ts --network sepolia
    
    echo ""
    echo -e "${GREEN}Complete demonstration finished!${NC}"
    ;;
  5)
    echo ""
    echo -e "${GREEN}Goodbye!${NC}"
    echo ""
    exit 0
    ;;
  *)
    echo ""
    echo -e "${YELLOW}Invalid choice. Please run again and select 1-5.${NC}"
    echo ""
    exit 1
    ;;
esac

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Demo complete! Run './scripts/judge-demo.sh' again for more options.${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
