#!/bin/bash

echo "Testing COO Assistant API..."

# Check health
echo -e "\n1. Health Check:"
curl -s http://localhost:3000/health | jq

# Trigger analysis
echo -e "\n2. Triggering Analysis:"
curl -s -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "startup_id": "test-startup-001",
    "data": {
      "context": "API test",
      "priority": "high"
    }
  }' | jq

# Check metrics
echo -e "\n3. Learning Metrics:"
curl -s http://localhost:3000/api/metrics | jq

# Check queue status
echo -e "\n4. Queue Status:"
curl -s http://localhost:3000/api/queue/status | jq

# Test webhook
echo -e "\n5. Testing Webhook:"
curl -s -X POST http://localhost:3000/api/webhook/brightdata \
  -H "Content-Type: application/json" \
  -d '{
    "startup_id": "test-startup-001",
    "trigger_analysis": true,
    "data": {
      "new_reviews": 25,
      "avg_rating": 3.8
    }
  }' | jq