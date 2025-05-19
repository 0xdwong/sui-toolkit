#!/bin/bash
# Build script for Cloudflare Pages

# Make script exit when a command fails
set -e

# Print each command before executing it
set -x

# Install dependencies with --no-immutable flag
yarn install --no-immutable

# Build the project with CI=false to ignore ESLint errors
CI=false yarn build 