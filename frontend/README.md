Multi-Agent Engine

A Dockerized multi-agent document processing and review system built
with FastAPI, Celery, RabbitMQ, Redis, React, Tailwind CSS 3.4.x,
Prometheus, and Grafana.

1. Architecture

React Frontend
      |
      v
FastAPI API
      |
      v
Celery / RabbitMQ
      |
      +-------------------+
      |         |         |
      v         v         v
     OCR   Compliance  Anomaly
   Worker     Worker     Worker
      |         |         |
      +---------+---------+
                |
                v
           Aggregate Task
                |
                v
              Redis
                |
                v
          Task Result/API

Monitoring:
FastAPI --------RabbitMQ --------> Prometheus ----> Grafana
Redis -----------/
Containers ------/
Workers --------/

2. Main Features

Backend

FastAPI API

Celery asynchronous task processing

RabbitMQ task broker

Redis task state/result storage

OCR agent

Compliance agent

Anomaly Detection agent

Aggregate workflow

Health endpoint

Prometheus metrics endpoint

Frontend

React + Vite

Tailwind CSS 3.4.x

Dashboard

Documents page

Tasks page

System Health page

Agent status

Document submission

Task status tracking

Responsive UI

Monitoring

Prometheus

Grafana

FastAPI metrics

Application metrics

Worker metrics

RabbitMQ metrics

Redis metrics

Container metrics where configured

Preconfigured Grafana dashboard

3. Prerequisites

Install: - Docker Desktop - Node.js - npm - Git

Verify:

docker --version
docker compose version
node --version
npm --version

Docker Desktop must be running before starting the backend.

4. Project Structure

Multi_Agent_Engine/
├── app/
├── frontend/
├── monitoring/
│   ├── prometheus/
│   └── grafana/
├── secrets/
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
├── .env
├── .env.example
└── README.md

5. Environment Configuration

From the project root:

copy .env.example .env

Keep secrets outside source code.

Prometheus runs inside Docker, so Docker service names must be used for
internal scrape targets, for example:

api:8000
rabbitmq:15692
redis-exporter:9121
cadvisor:8080

Do not use localhost for Prometheus-to-container scrape targets.

6. Create Redis Secret

python -c "import secrets,pathlib; pathlib.Path('secrets/redis_password').write_text(secrets.token_urlsafe(32))"

7. Create RabbitMQ Secret

For local development:

python -c "import pathlib; pathlib.Path('secrets/rabbitmq_password').write_text('guest
')"

Use a stronger password for non-local environments.

8. Start Backend

From the project root:

docker compose up -d --build

Check:

docker compose ps

Expected core services:

api
rabbitmq
redis
worker_ocr
worker_compliance
worker_anomaly

9. Backend Health Check

Open:

http://localhost:8000/health

Or:

curl http://localhost:8000/health

10. Swagger API Documentation

Open:

http://localhost:8000/docs

Main endpoints:

GET  /health
POST /documents
GET  /tasks/{task_id}
GET  /metrics

11. Document Workflow

POST /documents
       |
       v
      OCR
       |
       +----------------+
       |                |
       v                v
 Compliance          Anomaly
       |                |
       +-------+--------+
               |
               v
           Aggregate
               |
               v
        GET /tasks/{id}

The API accepts a document request, creates an asynchronous task, and
returns a task ID that can be polled with:

GET /tasks/{task_id}

12. Frontend Setup

cd frontend

Install:

npm install

The frontend uses React, Vite, and Tailwind CSS 3.4.x.

13. Tailwind CSS

The Tailwind content paths should include:

./index.html
./src/**/*.{js,ts,jsx,tsx}

14. Frontend API Configuration

Create or update:

frontend/.env

Use:

VITE_API_URL=http://localhost:8000

Restart Vite after changing .env.

15. Start Frontend

From Multi_Agent_Engine/frontend:

npm run dev

Open:

http://localhost:5173

16. Frontend Pages

/           Dashboard
/documents  Document submission
/tasks      Task monitoring
/health     System Health

17. Prometheus

Prometheus is run through Docker. A separate Windows installation is not
required.

Open:

http://localhost:9090

Health:

http://localhost:9090/-/healthy

Targets:

http://localhost:9090/targets

18. FastAPI Metrics

The API exposes:

GET /metrics

Open:

http://localhost:8000/metrics

Prometheus should scrape the API through:

api:8000

19. Application Metrics

Useful custom metrics include:

mae_documents_submitted_total
mae_documents_processed_total
mae_documents_failed_total
mae_task_processing_seconds
mae_active_tasks
mae_agent_tasks_total

Useful agent labels:

ocr
compliance
anomaly
aggregate

Do not use unique IDs such as task_id or document_id as Prometheus
labels.

20. Worker Metrics

Worker metrics can include:

mae_worker_tasks_started_total
mae_worker_tasks_completed_total
mae_worker_tasks_failed_total
mae_worker_task_duration_seconds

The existing Celery routing and queues must remain unchanged.

21. RabbitMQ Monitoring

RabbitMQ monitoring should expose useful metrics such as:

queue messages

ready messages

unacknowledged messages

consumers

connections

channels

publish rate

delivery rate

Use the RabbitMQ Prometheus-compatible metrics endpoint where
configured.

22. Redis Monitoring

When a Redis exporter is configured, Prometheus can monitor:

Redis availability

connected clients

memory usage

command activity

uptime

key statistics

Typical internal exporter target:

redis-exporter:9121

23. Container Monitoring

If cAdvisor is enabled, Prometheus can collect:

CPU usage

memory usage

network traffic

filesystem usage

container uptime

Typical internal target:

cadvisor:8080

24. Grafana

Grafana is run through Docker. A separate Windows installation is not
required.

Open:

http://localhost:3000

The Prometheus datasource should be provisioned automatically.

Grafana credentials should be configured through .env rather than
hardcoded in source code.

25. Grafana Dashboard

The Multi-Agent Engine dashboard should include:

System

API availability

API request rate

API error rate

API latency

active requests

Agents

OCR tasks

Compliance tasks

Anomaly tasks

failed tasks

task duration

RabbitMQ

queue depth

ready messages

unacknowledged messages

consumers

Redis

availability

memory

clients

command activity

Containers

CPU

memory

network

uptime

Application

documents submitted

documents processed

documents failed

active tasks

26. Start Complete Stack

From project root:

docker compose up -d --build

Check:

docker compose ps

Open:

Frontend:       http://localhost:5173
API:            http://localhost:8000
Swagger:        http://localhost:8000/docs
API Metrics:    http://localhost:8000/metrics
Prometheus:     http://localhost:9090
Prometheus:     http://localhost:9090/targets
Grafana:        http://localhost:3000
RabbitMQ:       http://localhost:15672

27. Test Document Processing

For a local test image accessible to the OCR worker:

docker compose exec -T worker_ocr python -c "from PIL import Image, ImageDraw; img = Image.new('RGB', (900, 400), 'white'); d = ImageDraw.Draw(img); d.text((90, 80), 'INVOICE 4471', fill='black'); img.save('/tmp/invoice.png')"

Submit:

curl -s -X POST localhost:8000/documents -H "Content-Type: application/json" -d "{"document_id":"INV-4471","source_uri":"file:///tmp/invoice.png","content_type":"image/png","agents":["ocr","compliance","anomaly"],"pipeline":true}"

Then poll the returned task:

curl -s localhost:8000/tasks/TASK_ID

Replace TASK_ID with the actual returned ID.

28. Useful Docker Commands

docker compose ps
docker compose logs api
docker compose logs worker_ocr
docker compose logs worker_compliance
docker compose logs worker_anomaly
docker compose logs prometheus
docker compose logs grafana
docker compose logs -f api

Stop:

docker compose down

Rebuild:

docker compose up -d --build

29. Troubleshooting

Frontend shows API Offline

Check:

http://localhost:8000/health

Then check:

frontend/.env

Expected:

VITE_API_URL=http://localhost:8000

Restart Vite after changing .env.

Prometheus target is DOWN

Check:

docker compose ps
docker compose logs prometheus

Remember: inside Docker use:

api:8000

not:

localhost:8000

Grafana has no data

Open:

http://localhost:9090/targets

Confirm required targets are UP.

Then inspect:

docker compose logs grafana
docker compose logs prometheus

30. Production Notes

For production:

change default Grafana credentials

use strong Redis and RabbitMQ credentials

keep secrets out of source control

restrict management ports

configure HTTPS/reverse proxy

configure persistent storage

define Prometheus retention

avoid high-cardinality metric labels

secure monitoring endpoints

31. Technology Stack

Backend

Python

FastAPI

Celery

Messaging / Storage

RabbitMQ

Redis

Processing

OCR

Compliance Agent

Anomaly Detection Agent

LangGraph-style workflow layer

Frontend

React

Vite

Tailwind CSS 3.4.x

Monitoring

Prometheus

Grafana

RabbitMQ metrics

Redis exporter

cAdvisor where enabled

Infrastructure

Docker

Docker Compose

32. Final Verification Checklist

[ ] Docker Desktop running
[ ] docker compose config succeeds
[ ] API running
[ ] RabbitMQ running
[ ] Redis running
[ ] OCR worker running
[ ] Compliance worker running
[ ] Anomaly worker running
[ ] Frontend running
[ ] /health works
[ ] /docs works
[ ] /metrics works
[ ] Prometheus opens
[ ] Prometheus targets are UP
[ ] Grafana opens
[ ] Prometheus datasource works
[ ] Grafana dashboard loads
[ ] Document submission works
[ ] Task polling works
[ ] System Health page works

33. Quick Startup

cd Multi_Agent_Engine
docker compose up -d --build
cd frontend
npm install
npm run dev

Then open:

http://localhost:5173

Monitoring:

http://localhost:9090
http://localhost:3000

The result is a complete multi-agent document processing application
with a React operational UI and a Prometheus/Grafana observability
layer.