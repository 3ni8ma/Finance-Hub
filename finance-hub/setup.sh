#!/usr/bin/env bash
set -e

echo "╔══════════════════════════════════════════╗"
echo "║         Finance Hub — Quick Setup        ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Copy .env files if not present
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo "✅  Created backend/.env from template"
  echo "    ⚠️  Edit backend/.env to add your API keys"
else
  echo "✓  backend/.env already exists"
fi

if [ ! -f ml-service/.env ]; then
  cp ml-service/.env.example ml-service/.env
  echo "✅  Created ml-service/.env"
fi

echo ""
echo "Starting Docker Compose..."
docker-compose up --build -d

echo ""
echo "Waiting for Postgres to be ready..."
sleep 8

echo "Running database migrations..."
docker-compose exec backend npx prisma migrate dev --name init --skip-seed

echo "Seeding database (demo user + sample data)..."
docker-compose exec backend npx prisma db seed

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║         Finance Hub is running!          ║"
echo "╠══════════════════════════════════════════╣"
echo "║  Frontend  → http://localhost:5173       ║"
echo "║  Backend   → http://localhost:3001       ║"
echo "║  ML Docs   → http://localhost:8000/docs  ║"
echo "╠══════════════════════════════════════════╣"
echo "║  Demo login: demo@financehub.io          ║"
echo "║  Password:   demo1234                    ║"
echo "╚══════════════════════════════════════════╝"
