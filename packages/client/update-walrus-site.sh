#!/bin/bash

# build the site
./build-walrus.sh

# update the site
site-builder update --epochs 1 ./build 0xd4e6192958e4f466420fd8e5f7d00787aa34d2b8e6ba8099152bc113fffd025c

