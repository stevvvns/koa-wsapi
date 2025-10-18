#!/bin/bash
set -ex
cd client
npx esbuild --bundle --format=esm --platform=browser --outfile=dist/main.mjs index.js
npx esbuild --bundle --format=esm --platform=browser --outfile=dist/worker.mjs worker.js
cp index.html dist/
cd ..
node server.js
