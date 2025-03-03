#!/bin/bash

# Install system dependencies for OpenCV
apt-get update && apt-get install -y \
    libsm6 \
    libxext6 \
    libxrender-dev \
    ffmpeg

# Install Python dependencies
pip install --no-cache-dir -r requirements.txt
