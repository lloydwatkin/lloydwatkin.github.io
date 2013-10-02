#!/bin/bash

# Start jekyll with local IP address for demos/workshop#!/bin/bash

# Start jekyll with local IP address for demos/workshops

export MY_IP=$(ifconfig | grep -A1 wlan0 | cut -d: -f2 | cut -d ' ' -f1 | grep \\.)
export JEKYLL_ENV=development
echo "My IP is $MY_IP"
jekyll --watch server
