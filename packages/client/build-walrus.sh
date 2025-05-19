#!/bin/bash

# Build the React app
echo "Building the React app..."
yarn build

# Ensure ws-resources.json is in the build directory
echo "Copying ws-resources.json to build directory..."
cp ./public/ws-resources.json ./build/

echo "Build completed successfully!"
echo "You can now deploy the 'build' directory to your Walrus site." 