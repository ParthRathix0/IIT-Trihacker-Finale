#!/bin/bash

# AegisV3 Full System Demonstration Script
# This script redeploys contracts and runs the full demonstration

cd "$(dirname "$0")/.."

echo "🚀 Starting AegisV3 Full System Demonstration..."
echo ""

# Redeploy contracts
echo "📦 Redeploying contracts..."
yarn deploy --reset

echo ""
echo "⏳ Running demonstration..."
echo ""

# Run the demo
npx hardhat run scripts/demo-full-system.ts --network localhost

echo ""
echo "✅ Demonstration complete!"
