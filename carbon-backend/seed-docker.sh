#!/bin/sh
# Run seed after backend starts (called from docker-compose or CI)
# Usage: docker-compose exec backend sh seed-docker.sh
cd /app
node -e "
const { execSync } = require('child_process');
try {
  execSync('node dist/database/seeds/run-seed.js', { stdio: 'inherit' });
} catch(e) {
  process.exit(1);
}
"
