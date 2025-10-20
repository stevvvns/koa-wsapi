#!/bin/bash
set -ex
cd client
npx esbuild --bundle --format=esm --platform=browser --outfile=dist/main.js index.js
npx esbuild --bundle --format=esm --platform=browser --outfile=dist/worker.js worker.js
cp index.html dist/
cd ..
node server.js
