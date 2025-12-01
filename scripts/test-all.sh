#!/bin/bash
# Comprehensive Test Script
# Runs all tests to catch errors automatically

set -e  # Exit on error

echo "🧪 Running Comprehensive Test Suite..."
echo ""

# Step 1: Build verification
echo "📦 Step 1: Verifying build..."
npm run test:build || {
  echo "❌ Build verification failed!"
  exit 1
}

# Step 2: Unit tests
echo ""
echo "🔬 Step 2: Running unit tests..."
npm test || {
  echo "❌ Unit tests failed!"
  exit 1
}

# Step 3: E2E tests
echo ""
echo "🌐 Step 3: Running E2E tests..."
npm run test:e2e || {
  echo "❌ E2E tests failed!"
  exit 1
}

echo ""
echo "✅ All tests passed! No errors detected."
echo "🎉 Your application is ready to use."

