#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e  

# Create a virtual environment (only if it doesn't exist)
if [ ! -d "venv" ]; then
  python3 -m venv venv
fi

# Activate the virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies inside the virtual environment
pip install -r requirements.txt  

# Start the Node.js server
node server.js  
