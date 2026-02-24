# 🏥 Pharma Inventory & Multi-Warehouse Batch Tracking System

> A comprehensive web-based pharmaceutical inventory management system designed for batch tracking, multi-warehouse support, real-time monitoring, and regulatory compliance.

[![Status: In Development](https://img.shields.io/badge/Status-In%20Development-yellow.svg)]()
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)


> **⚠️ Project Status**: This project is currently in the **planning and initial development phase**. The architecture and features described below represent the planned implementation. See the [Current Status](#-current-status) section for details on what's been completed.

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
- 

---

## 📊 Current Status

**Development Phase**: Planning & Initial Setup  
**Version**: 0.1.0-alpha  
**Last Updated**: February 2024

### ✅ Completed
- [x] Business Requirements Specification (BRS)
- [x] Software Requirements Specification (SRS)
- [x] Functional Requirements Specification (FRS)
- [x] System architecture design
- [x] Database schema design
- [x] API endpoint planning
- [x] Technology stack selection

### 🚧 In Progress
- [ ] Development environment setup
- [ ] Database implementation
- [ ] Basic authentication module
- [ ] Core API framework setup

### 📋 Planned (Not Yet Started)
- Medicine & Batch management modules
- Warehouse inventory system
- Real-time alerting system
- Temperature monitoring
- Recall workflow
- Reporting engine
- WebSocket implementation
- Frontend development

### 🎯 Current Focus
Setting up the foundational architecture and implementing the authentication and user management system. The project follows a phased development approach with emphasis on building a solid, scalable foundation.

---

## 🎯 Overview

This system is designed to address critical challenges in pharmaceutical warehouse management including:

- **Batch Traceability**: Complete tracking of medicine batches from allocation to dispatch
- **Multi-Location Management**: Centralized control across multiple warehouse locations
- **Regulatory Compliance**: Automated audit logging and compliance reporting
- **Expiry Management**: Proactive monitoring and alerting for expiring stock
- **Temperature Control**: Real-time temperature monitoring and breach detection
- **Recall Management**: Streamlined batch recall workflow with approval mechanism

### Target Business Impact

- 100% batch traceability for regulatory compliance
- Zero negative stock errors through transactional operations
- Real-time alerting capabilities
- Comprehensive audit logs for all critical actions
- Reduced expiry-related losses through proactive monitoring

---

## ✨ Planned Features

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



---


## 📖 Usage

> **Note**: The following usage examples represent the planned functionality. Implementation is in progress.

### Admin Panel (Planned)
Will be accessible at `http://localhost:8000/admin`

**Planned Admin Capabilities:**
- User management
- Medicine catalog management
- Warehouse configuration
- Recall approval/rejection
- System-wide reporting

### Warehouse Manager Dashboard (Planned)
Will be accessible at `http://localhost:3000/dashboard`

**Planned Manager Capabilities:**
- Stock allocation and dispatch
- Inter-warehouse transfers
- Temperature logging
- Recall request submission
- Warehouse-specific reports

### API Usage Examples

> **Status**: API endpoints are in the design phase. The following examples show the planned structure.

#### Authentication (Planned)
```bash
# Login endpoint (planned)
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'

# Expected response structure
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

#### Stock Dispatch (Planned)
```bash
# Dispatch endpoint (planned)
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

## 📚 API Documentation (Planned)

> **Status**: API endpoints are currently in the design phase. Full implementation pending.

### Planned Base URL
```
http://localhost:8000/api
```

### Planned Core Endpoints

> These endpoints represent the designed API structure. Implementation status varies by module.

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

### WebSocket (Planned)

> **Status**: WebSocket implementation for real-time updates is planned for Phase 2.

```javascript
// Planned WebSocket connection
const ws = new WebSocket('ws://localhost:8000/ws/alerts');

ws.onmessage = function(event) {
  const alert = JSON.parse(event.data);
  console.log('New alert:', alert);
};
```

---

## 🗄️ Database Schema (Design)

> **Status**: Database schema has been designed and is ready for implementation.

### Planned Core Entities

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

## ⚡ Performance Targets

### Design Specifications
- **Target Concurrent Users**: 500+ simultaneous users
- **Target Dashboard Load**: < 3 seconds initial load
- **Target WebSocket Latency**: < 2 seconds for real-time alerts
- **Database Design**: Optimized with indexes and query caching strategy
- **Target API Response**: < 200ms for 95th percentile

### Planned Optimization Techniques
- **Redis Caching**: Frequently accessed data caching (1-hour TTL)
- **Database Indexing**: Foreign keys, unique constraints, compound indexes
- **Connection Pooling**: Reusable database connections
- **Lazy Loading**: Frontend components loaded on demand
- **Background Jobs**: Heavy processing offloaded to Celery workers

### Scalability Design
- **Horizontal Scaling**: Stateless API design for load balancing
- **Database Replication**: Read replicas for query distribution (planned)
- **Redis Cluster**: Distributed caching and pub/sub capability
- **Docker Orchestration**: Kubernetes-ready architecture

---

## 🧪 Testing (Planned)

> **Status**: Testing infrastructure will be implemented alongside core modules.

```bash
# Planned test commands
pytest tests/unit

# Integration tests (once modules are integrated)
pytest tests/integration

# Coverage reporting
pytest --cov=pharma_inventory --cov-report=html

# Specific test module
pytest tests/test_inventory.py -v
```

### Planned Test Coverage Goals
- Unit Tests: > 80%
- Integration Tests: > 60%
- Critical Paths: 100%

---

## 📊 Monitoring & Logging (Planned)

> **Status**: Monitoring and logging infrastructure planned for Phase 2 implementation.

### Planned Application Logs
```python
# Planned log levels: DEBUG, INFO, WARNING, ERROR, CRITICAL
# Planned location: /var/log/pharma_inventory/
```

### Planned Metrics
- Request rate and latency
- Error rates by endpoint
- Database query performance
- Background job success rate
- WebSocket connection count

### Planned Health Checks
```bash
# Planned health endpoint
curl http://localhost:8000/health

# Expected response structure
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

We welcome contributions at this early stage! Whether you're interested in:
- 🐛 Reporting bugs or issues
- 💡 Suggesting new features
- 📝 Improving documentation
- 💻 Writing code
- 🧪 Adding tests
- 🎨 Designing UI/UX

Your input is valuable!


### Development Setup for Contributors
```bash
# Install development dependencies (once available)
pip install -r requirements-dev.txt

# Install pre-commit hooks (once configured)
pre-commit install

# Run code formatting
black .

# Run linting
flake8 .

# Run type checking
mypy .
```

### Code Standards (Planned)
- Follow PEP 8 style guide for Python code
- Write descriptive commit messages
- Add unit tests for new features (once testing infrastructure is ready)
- Update documentation for any API changes
- Comment complex logic
- Use type hints where applicable

### Areas Where We Need Help

**High Priority:**
- [ ] Setting up CI/CD pipeline
- [ ] Creating database migration scripts
- [ ] Implementing authentication system
- [ ] Writing unit tests
- [ ] Frontend development (HTML/CSS/JS)

**Documentation:**
- [ ] Improving installation instructions
- [ ] Creating user guides
- [ ] API documentation examples
- [ ] Architecture diagrams

**Design:**
- [ ] UI/UX mockups for dashboard
- [ ] Logo and branding
- [ ] Responsive design patterns

### Communication

- **GitHub Issues**: For bug reports and feature requests
- **Pull Requests**: For code contributions
- **Discussions**: For general questions and ideas
- **Email**: [To be added] for private inquiries

### First-Time Contributors

Never contributed to open source before? No problem! We're happy to help you get started. Look for issues tagged with `good first issue` - these are simpler tasks perfect for learning our codebase.

---



---

## 👥 Team

**Project Lead**: [Suraj Bhavake  
**Status**: Two developer, open to collaborators  
**Contact**: [GitHub Profile](https://github.com/surajbhavake)

### Looking for Team Members
This project is actively seeking contributors in:
- Backend development (Python/FastAPI)
- Frontend development (JavaScript/HTML/CSS)
- Database design and optimization
- DevOps and deployment
- Technical documentation
- UI/UX design

Interested in joining? Open an issue or reach out!

---

## 🙏 Acknowledgments

- FastAPI community for excellent documentation
- Redis for robust caching and pub/sub
- Celery for reliable background job processing
- Docker for containerization best practices

---

## 📞 Support & Contact

This project is in early development. Support channels are being established.

**Current Options:**
- **GitHub Issues**: [Report bugs or request features](https://github.com/surajbhavakepharma-inventory-system/issues)
- **GitHub Discussions**: [Ask questions or share ideas](https://github.com/surajbhavake/pharma-inventory-system/discussions)
- **Email**: [surajbhavake2@gmail.com] (for private inquiries)

**Planned:**
- Dedicated documentation site
- Community Discord/Slack channel
- FAQ section
- Video tutorials

### Response Time
As this is an early-stage project with limited resources:
- **Issues**: Typically reviewed within 48-72 hours
- **Pull Requests**: Reviewed within 1 week
- **Email**: Within 3-5 business days

Your patience and understanding are appreciated!

---


While the project is in early development, the planning, architecture, and approach demonstrate production-ready thinking and capabilities.

---

**⭐ If you find this project interesting, please consider starring it! Stars help others discover the project and motivate continued development.**

**🤝 Interested in collaborating? Open an issue or reach out directly. Let's build something great together!**
