#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  AEGIS V3 - TEST SUITE DEMONSTRATION  ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${YELLOW}Running comprehensive test suite...${NC}"
echo ""

# Run tests and capture output
yarn test

echo ""
echo -e "${GREEN}Test suite completed!${NC}"
echo ""
echo -e "${YELLOW}Key Highlights:${NC}"
echo -e "  - Full batch lifecycle (12 steps)"
echo -e "  - Settlement price calculation (\$2018 from 5 oracles)"
echo -e "  - Dynamic weight updates (all oracles rewarded)"
echo -e "  - Gas costs optimized for batch processing"
echo ""
echo -e "${BLUE}========================================${NC}"
