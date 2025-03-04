#!/bin/bash

# Exit script on any error
set -e  

# Create a virtual environment (only if it doesn't exist)
if [ ! -d "venv" ]; then
  python3 -m venv venv
fi

# Activate the virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install required Python packages
pip install opencv-python-headless==4.5.3.56 \
            numpy \
            pillow \
            ultralytics \
            jsonschema

# Start the Node.js server
node server.js  
