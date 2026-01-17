#!/bin/sh

echo "=== Starting DRMS Application ==="
echo "Date: $(date)"
echo "User: $(whoami)"
echo "Node: $(node --version)"

# Run database migrations
echo ""
echo "=== Running Database Migrations ==="
if npx prisma migrate deploy; then
    echo "✅ Migrations completed successfully"
else
    echo "❌ Migrations failed - starting anyway (tables might already exist)"
fi

# Start the application
echo ""
echo "=== Starting Next.js Server ==="
exec node server.js