#!/bin/bash
cd /Users/sachinsharma/Developer/temp/dopamine
export PATH="/Users/sachinsharma/Library/pnpm:/Users/sachinsharma/Library/pnpm/nodejs/24.0.2/bin:/Users/sachinsharma/.pyenv/shims:/Users/sachinsharma/.pyenv/versions/3.12.1/bin:/usr/local/bin:/usr/bin:/bin"
export GOOGLE_CLOUD_PROJECT_ID=your-gcp-project-id
export GOOGLE_CLOUD_LOCATION=global
export HOME=/Users/sachinsharma

# Build first to pick up any code changes
npm run build 2>&1

# Run the pipeline
node dist/pipeline/runner.js 2>&1
