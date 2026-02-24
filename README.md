# Pharma-Inventory-Multi-Warehouse-System
# 🏥 Pharma Inventory & Multi-Warehouse Batch Tracking System

> A comprehensive web-based pharmaceutical inventory management system with batch tracking, multi-warehouse support, real-time monitoring, and regulatory compliance features.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![Docker](https://img.shields.io/badge/docker-enabled-blue.svg)](https://www.docker.com/)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Security](#security)
- [Performance](#performance)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

This system addresses critical challenges in pharmaceutical warehouse management including:

- **Batch Traceability**: Complete tracking of medicine batches from allocation to dispatch
- **Multi-Location Management**: Centralized control across multiple warehouse locations
- **Regulatory Compliance**: Automated audit logging and compliance reporting
- **Expiry Management**: Proactive monitoring and alerting for expiring stock
- **Temperature Control**: Real-time temperature monitoring and breach detection
- **Recall Management**: Streamlined batch recall workflow with approval mechanism

### Business Impact

- ✅ 100% batch traceability for regulatory compliance
- ✅ Zero negative stock errors through transactional operations
- ✅ Real-time alerts (< 2 seconds latency)
- ✅ Comprehensive audit logs for all critical actions
- ✅ Reduced expiry-related losses through proactive monitoring

---

## ✨ Key Features

### 🔐 User Management & RBAC
- JWT-based authentication
- Role-based access control (Admin, Warehouse Manager, Staff, Auditor)
- Password encryption using bcrypt
- Session management with token expiration

### 💊 Medicine & Batch Management
- Medicine catalog with manufacturer details
- Unique batch number tracking
- Manufacture and expiry date management
- Storage type classification
- Minimum stock threshold configuration

### 🏭 Multi-Warehouse Inventory
- Multiple warehouse location support
- Real-time stock allocation and tracking
- Inter-warehouse stock transfers with distributed locking
- Transaction-safe operations preventing data inconsistencies

### 📊 Stock Movement Ledger
- Complete audit trail of all stock movements
- Movement types: Allocation, Dispatch, Transfer, Return
- User attribution for accountability
- Timestamp-based tracking

### ⚠️ Intelligent Alerting System
- **Expiry Alerts**: 30-day advance warning for expiring batches
- **Low Stock Alerts**: Automatic threshold-based notifications
- **Temperature Breach Alerts**: Real-time temperature violation detection
- **WebSocket Integration**: Instant push notifications to dashboard

### 🌡️ Temperature Monitoring
- Continuous temperature logging per batch
- Configurable temperature range validation
- Automated breach detection and logging
- Compliance violation tracking

### 🚨 Recall Workflow
- Manager-initiated recall requests
- Admin approval/rejection mechanism
- Automatic batch blocking on approval
- Multi-warehouse notification system

### 📈 Reporting & Analytics
- Expiry reports (CSV/PDF)
- Stock movement reports
- Temperature violation reports
- Recall history reports
- Customizable date range filtering

### 🔍 Audit Logging
- Comprehensive activity logging
- User action tracking with IP addresses
- Before/after value comparison
- Login attempt monitoring
- Soft delete tracking

### 💓 Health Monitoring
- Database connectivity checks
- Redis status monitoring
- Background worker health verification
- API endpoint: `/health`

---

## 🏗️ System Architecture

```
┌─────────────────┐
│   Frontend      │
│  (HTML/CSS/JS)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   API Gateway   │
│   (FastAPI)     │
└────────┬────────┘
         │
    ┌────┴────┬──────────┬──────────┐
    ▼         ▼          ▼          ▼
┌────────┐ ┌──────┐ ┌────────┐ ┌──────────┐
│ Auth   │ │Inven-│ │ Notif- │ │ Report   │
│Service │ │tory  │ │ication │ │ Module   │
└────────┘ └──────┘ └────────┘ └──────────┘
    │         │          │          │
    └─────────┴──────────┴──────────┘
              │
         ┌────┴────┬──────────────┐
         ▼         ▼              ▼
    ┌────────┐ ┌───────┐    ┌─────────┐
    │  DB    │ │ Redis │    │ Celery  │
    │(MySQL) │ │Cache/ │    │ Worker  │
    │        │ │Pub/Sub│    │         │
    └────────┘ └───────┘    └─────────┘
```

### Component Overview

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **API Layer** | FastAPI/Django | RESTful endpoints, request validation |
| **Authentication** | JWT | Secure token-based auth |
| **Database** | MySQL/PostgreSQL | Persistent data storage |
| **Cache** | Redis | Session cache, distributed locking |
| **Message Queue** | Redis Pub/Sub | Real-time notifications |
| **Background Jobs** | Celery | Scheduled tasks (expiry checks) |
| **WebSocket** | FastAPI WebSocket | Real-time dashboard updates |
| **Container** | Docker | Isolated deployment environment |

---

## 🛠️ Technology Stack

### Backend
- **Framework**: FastAPI / Django REST Framework
- **Language**: Python 3.10+
- **Database**: MySQL 8.0+ / PostgreSQL 14+
- **Cache**: Redis 6+
- **Task Queue**: Celery
- **WebSocket**: FastAPI WebSocket

### Frontend
- **Core**: HTML5, CSS3, JavaScript (ES6+)
- **Real-time**: WebSocket Client
- **UI**: Responsive design

### DevOps
- **Containerization**: Docker & Docker Compose
- **Deployment**: AWS EC2 / Cloud Platform
- **Web Server**: Nginx (reverse proxy)
- **Process Manager**: Gunicorn / Uvicorn

### Security
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt
- **Transport Security**: HTTPS/TLS
- **Rate Limiting**: Redis-based

---

## 📦 Prerequisites

- **Docker** 20.10+
- **Docker Compose** 2.0+
- **Python** 3.10+ (for local development)
- **MySQL** 8.0+ or **PostgreSQL** 14+
- **Redis** 6+

---

## 🚀 Installation

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/pharma-inventory-system.git
cd pharma-inventory-system

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env

# Build and start containers
docker-compose up -d

# Run database migrations
docker-compose exec api python manage.py migrate

# Create superuser
docker-compose exec api python manage.py createsuperuser

# Access the application
# API: http://localhost:8000
# Frontend: http://localhost:3000
```

### Manual Installation

```bash
# Clone repository
git clone https://github.com/yourusername/pharma-inventory-system.git
cd pharma-inventory-system

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup database
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start Redis (separate terminal)
redis-server

# Start Celery worker (separate terminal)
celery -A pharma_inventory worker -l info

# Start Celery beat (scheduled tasks)
celery -A pharma_inventory beat -l info

# Run development server
python manage.py runserver
```

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DB_ENGINE=mysql  # or postgresql
DB_NAME=pharma_inventory
DB_USER=pharma_user
DB_PASSWORD=secure_password
DB_HOST=localhost
DB_PORT=3306

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# JWT
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=1

# Application
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1
SECRET_KEY=django-secret-key-here

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Alert Settings
EXPIRY_WARNING_DAYS=30
LOW_STOCK_THRESHOLD=10

# Email (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

---

## 📖 Usage

### Admin Panel
Access at `http://localhost:8000/admin`

**Admin Capabilities:**
- User management
- Medicine catalog management
- Warehouse configuration
- Recall approval/rejection
- System-wide reporting

### Warehouse Manager Dashboard
Access at `http://localhost:3000/dashboard`

**Manager Capabilities:**
- Stock allocation and dispatch
- Inter-warehouse transfers
- Temperature logging
- Recall request submission
- Warehouse-specific reports

### API Usage

#### Authentication
```bash
# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'

# Response
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

#### Stock Dispatch
```bash
curl -X POST http://localhost:8000/api/stock/dispatch \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_id": 123,
    "warehouse_id": 1,
    "quantity": 50
  }'
```

---

## 📚 API Documentation

### Base URL
```
http://localhost:8000/api
```

### Core Endpoints

#### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | User login |
| POST | `/auth/logout` | User logout |
| POST | `/auth/refresh` | Refresh token |

#### Medicines
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/medicines` | List all medicines |
| POST | `/medicines` | Create medicine |
| GET | `/medicines/{id}` | Get medicine details |
| PUT | `/medicines/{id}` | Update medicine |
| DELETE | `/medicines/{id}` | Soft delete medicine |

#### Batches
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/batches` | List all batches |
| POST | `/batches` | Create batch |
| GET | `/batches/{id}` | Get batch details |
| PUT | `/batches/{id}` | Update batch |

#### Warehouses
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/warehouses` | List warehouses |
| POST | `/warehouses` | Create warehouse |
| GET | `/warehouses/{id}/stock` | Get warehouse stock |

#### Stock Operations
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/stock/allocate` | Allocate batch to warehouse |
| POST | `/stock/dispatch` | Dispatch stock |
| POST | `/stock/transfer` | Transfer between warehouses |
| GET | `/stock/movements` | Get movement history |

#### Alerts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/alerts` | List active alerts |
| GET | `/alerts/expiry` | Expiry alerts |
| GET | `/alerts/low-stock` | Low stock alerts |
| GET | `/alerts/temperature` | Temperature breach alerts |

#### Recalls
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/recalls` | Request recall |
| PUT | `/recalls/{id}/approve` | Approve recall (admin) |
| PUT | `/recalls/{id}/reject` | Reject recall (admin) |

#### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reports/expiry?format=csv` | Expiry report |
| GET | `/reports/movements?format=pdf` | Stock movement report |
| GET | `/reports/temperature` | Temperature violation report |

#### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | System health check |

### WebSocket
```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:8000/ws/alerts');

ws.onmessage = function(event) {
  const alert = JSON.parse(event.data);
  console.log('New alert:', alert);
};
```

---

## 🗄️ Database Schema

### Core Entities

```sql
Users
- id (PK)
- email (unique)
- password_hash
- role_id (FK)
- created_at
- is_active

Medicines
- id (PK)
- name (unique)
- manufacturer
- category
- storage_type
- min_stock_threshold
- created_at

Batches
- id (PK)
- batch_number (unique)
- medicine_id (FK)
- manufacture_date
- expiry_date
- total_quantity
- temp_min
- temp_max
- is_recalled
- created_at

Warehouses
- id (PK)
- name
- location
- created_at

WarehouseStock
- id (PK)
- warehouse_id (FK)
- batch_id (FK)
- quantity
- updated_at
- UNIQUE(warehouse_id, batch_id)

StockMovements
- id (PK)
- batch_id (FK)
- warehouse_id (FK)
- movement_type (enum)
- quantity
- user_id (FK)
- created_at

TemperatureLogs
- id (PK)
- batch_id (FK)
- warehouse_id (FK)
- temperature
- is_violation
- logged_at

RecallRequests
- id (PK)
- batch_id (FK)
- requested_by (FK)
- reason
- status (pending/approved/rejected)
- approved_by (FK)
- created_at

AuditLogs
- id (PK)
- user_id (FK)
- action
- entity_type
- entity_id
- old_value
- new_value
- ip_address
- created_at

Alerts
- id (PK)
- alert_type (enum)
- severity (enum)
- message
- is_acknowledged
- created_at
```

### Relationships
- One Medicine → Many Batches
- One Batch → Many WarehouseStock entries
- One Warehouse → Many WarehouseStock entries
- One Batch → Many StockMovements
- One User → Many StockMovements
- One Batch → Many TemperatureLogs

---

## 🔒 Security

### Authentication & Authorization
- **JWT Tokens**: Stateless authentication with 1-hour expiration
- **bcrypt**: Password hashing with salt
- **RBAC**: Role-based access control with 4 user levels
- **Rate Limiting**: API endpoint throttling (100 requests/minute)

### Data Protection
- **HTTPS Only**: TLS 1.2+ enforced in production
- **SQL Injection**: Parameterized queries via ORM
- **XSS Protection**: Input sanitization and CSP headers
- **CSRF Protection**: Token-based validation

### Operational Security
- **Audit Logging**: All critical actions logged with user attribution
- **IP Tracking**: Request origin logging for security analysis
- **Soft Deletes**: Data retention for compliance and recovery
- **Encrypted Fields**: Sensitive data encrypted at rest

### Best Practices
```python
# Example: Password validation
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 number
- At least 1 special character
```

---

## ⚡ Performance

### Specifications
- **Concurrent Users**: Supports 500+ simultaneous users
- **Dashboard Load**: < 3 seconds initial load
- **WebSocket Latency**: < 2 seconds for real-time alerts
- **Database Queries**: Optimized with indexes and query caching
- **API Response**: < 200ms for 95th percentile

### Optimization Techniques
- **Redis Caching**: Frequently accessed data cached (1-hour TTL)
- **Database Indexing**: Foreign keys, unique constraints, compound indexes
- **Connection Pooling**: Reusable database connections
- **Lazy Loading**: Frontend components loaded on demand
- **Background Jobs**: Heavy processing offloaded to Celery workers

### Scalability
- **Horizontal Scaling**: Stateless API design for load balancing
- **Database Replication**: Read replicas for query distribution
- **Redis Cluster**: Distributed caching and pub/sub
- **Docker Orchestration**: Kubernetes-ready architecture

---

## 🧪 Testing

```bash
# Run unit tests
pytest tests/unit

# Run integration tests
pytest tests/integration

# Run with coverage
pytest --cov=pharma_inventory --cov-report=html

# Run specific test module
pytest tests/test_inventory.py -v
```

### Test Coverage Goals
- Unit Tests: > 80%
- Integration Tests: > 60%
- Critical Paths: 100%

---

## 📊 Monitoring & Logging

### Application Logs
```python
# Log levels: DEBUG, INFO, WARNING, ERROR, CRITICAL
# Location: /var/log/pharma_inventory/
```

### Metrics
- Request rate and latency
- Error rates by endpoint
- Database query performance
- Background job success rate
- WebSocket connection count

### Health Checks
```bash
# Check system health
curl http://localhost:8000/health

# Response
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "celery_worker": "active",
  "timestamp": "2024-02-24T10:30:00Z"
}
```

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Setup
```bash
# Install development dependencies
pip install -r requirements-dev.txt

# Run pre-commit hooks
pre-commit install

# Format code
black .

# Lint code
flake8 .

# Type checking
mypy .
```

### Code Standards
- Follow PEP 8 style guide
- Write unit tests for new features
- Update documentation
- Use meaningful commit messages

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Authors

- **Your Name** - *Initial work* - [GitHub Profile](https://github.com/yourusername)

---

## 🙏 Acknowledgments

- FastAPI community for excellent documentation
- Redis for robust caching and pub/sub
- Celery for reliable background job processing
- Docker for containerization best practices

---

## 📞 Support

For issues, questions, or suggestions:

- **GitHub Issues**: [Project Issues](https://github.com/yourusername/pharma-inventory-system/issues)
- **Email**: support@example.com
- **Documentation**: [Full Docs](https://docs.example.com)

---

## 🗺️ Roadmap

### Upcoming Features
- [ ] Mobile app (iOS/Android)
- [ ] AI-powered demand forecasting
- [ ] Integration with government regulatory systems
- [ ] Blockchain-based supply chain tracking
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Barcode/QR code scanning

---

## 📈 Project Status

**Current Version**: 1.0.0  
**Status**: Active Development  
**Last Updated**: February 2024

---

**⭐ If you find this project useful, please consider giving it a star!**
