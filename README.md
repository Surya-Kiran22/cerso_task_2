# SRS Ambiguity Detector

**SRS Ambiguity Detector** is a high-performance, full-stack web application that analyzes Software Requirements Specification (SRS) documents to identify, score, flag, and propose actionable rewrites for vague, unmeasurable, incomplete, or ambiguous requirement statements using a rule-based NLP analysis engine.

---

## 🏗️ Architecture Diagram

```
                             +-----------------------+
                             |   Browser Client      |
                             |   (React 18 + Vite)   |
                             +-----------+-----------+
                                         |
                                         v HTTP (Port 80)
                             +-----------------------+
                             |   Nginx Proxy         |
                             |   (least_conn LB)     |
                             +---+-------+-------+---+
                                 |       |       |
               +-----------------+       |       +-----------------+
               |                         v                         |
+--------------+----------+ +------------+------------+ +----------+--------------+
| Backend Instance 1      | | Backend Instance 2      | | Backend Instance 3      |
| Node.js + Express (:5000)| | Node.js + Express (:5000)| | Node.js + Express (:5000)|
+--------------+----------+ +------------+------------+ +----------+--------------+
               |                         |                         |
               +-------------------------+-------------------------+
                                         |
                                         v
                             +-----------------------+
                             |   MongoDB Database    |
                             |   (Mongoose Pool)     |
                             +-----------------------+
```

---

## ✨ Features

- **Requirements Text Input**: Paste up to 50,000 characters of SRS text with live character counter.
- **Document Parser**: Upload `.txt`, `.pdf` (`pdf-parse`), or `.docx` (`mammoth`) files (up to 2MB) to extract editable requirement text.
- **Rule-Based Ambiguity Engine**: Instant, synchronous evaluation (< 200 ms for 500 requirements) covering 12 distinct requirement defect categories.
- **Deduplication & Overlap Resolution**: Overlapping text matches resolve automatically to the highest severity defect.
- **Actionable Rewrites**: Template-based rewriter generates revised, measurable requirement statements.
- **Scoring & Rating Bands**: Evaluates individual requirement clear scores and total document ambiguity score (0..100).
- **JWT Authentication**: Secure register, login, and profile routes using bcrypt password hashing and stateless JWT tokens.
- **Analysis History & CRUD**: Save, list, view, and delete past analyses with strict per-user ownership enforcement.
- **Analytics Dashboard**: Interactive Recharts visualizations (BarChart for categories, LineChart for score history, PieChart for severity distribution) alongside summary stat boxes.
- **Load Balancing Cluster**: 3 stateless Express replicas behind Nginx `least_conn` reverse proxy with automatic health checks (`X-Served-By` response tracking).

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, `react-router-dom`, `axios`, `Recharts`. Pure HTML + hand-written ~80 lines CSS (`global.css`).
- **Backend**: Node.js, Express, `express-validator`, `helmet`, `cors`, `express-rate-limit`, `multer`.
- **Database**: MongoDB with Mongoose ODM (`maxPoolSize: 20`).
- **Load Balancer**: Nginx reverse proxy using `least_conn` strategy.
- **Containerization**: Docker & Docker Compose multi-container orchestrator.
- **Testing**: Jest + Supertest (Backend), Vitest + React Testing Library (Frontend), Node load testing script (50 concurrent users).

---

## 📁 Folder Structure

```
srs-ambiguity-detector/
├── docker-compose.yml
├── render.yaml
├── .gitignore
├── README.md
├── nginx/
│   └── nginx.conf
├── loadtest/
│   └── loadtest.js
├── sample/
│   └── sample_srs.txt
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── .env.example
│   ├── scripts/
│   │   └── seed.js
│   ├── src/
│   │   ├── server.js
│   │   ├── app.js
│   │   ├── config/db.js
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   └── Analysis.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── analyze.js
│   │   │   ├── upload.js
│   │   │   ├── analyses.js
│   │   │   ├── dashboard.js
│   │   │   └── health.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   ├── error.js
│   │   │   ├── rateLimit.js
│   │   │   └── validate.js
│   │   └── engine/
│   │       ├── analyzer.js
│   │       ├── splitter.js
│   │       ├── rewriter.js
│   │       └── categories/
│   │           ├── vagueTerms.js
│   │           ├── unmeasurableQuantity.js
│   │           ├── weakModals.js
│   │           ├── escapeClauses.js
│   │           ├── incomplete.js
│   │           ├── unclearReference.js
│   │           ├── passiveNoActor.js
│   │           ├── subjectiveTerms.js
│   │           ├── compoundRequirement.js
│   │           ├── missingMeasure.js
│   │           ├── universalQuantifiers.js
│   │           └── timeAmbiguity.js
│   └── tests/
│       ├── auth.test.js
│       ├── engine.test.js
│       └── analyze.test.js
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── global.css
        ├── api/client.js
        ├── context/AuthContext.jsx
        ├── components/
        │   ├── Navbar.jsx
        │   ├── ProtectedRoute.jsx
        │   ├── ResultView.jsx
        │   ├── ScoreBadge.jsx
        │   └── SeverityBadge.jsx
        ├── pages/
        │   ├── Login.jsx
        │   ├── Register.jsx
        │   ├── Analyze.jsx
        │   ├── History.jsx
        │   ├── Dashboard.jsx
        │   └── AnalysisDetail.jsx
        └── tests/
            ├── setup.js
            └── components.test.jsx
```

---

## 🔍 Ambiguity Categories & Examples

| # | Category ID | Label | Severity | Weight | Example Word / Phrase | Why it is a problem |
|---|-------------|-------|----------|--------|----------------------|----------------------|
| 1 | `VAGUE_TERMS` | Vague Terms | Medium | 2 | fast, quick, robust, easy, user-friendly | Lack measurable quantitative criteria. |
| 2 | `UNMEASURABLE_QUANTITY` | Unmeasurable Quantity | High | 3 | many, several, as much as possible | Missing specific numerical counts or bounds. |
| 3 | `WEAK_MODALS` | Weak Modals | Medium | 2 | should, may, could, is desirable | Ambiguous whether requirement is mandatory. |
| 4 | `ESCAPE_CLAUSES` | Escape Clauses | High | 3 | if possible, as appropriate, where feasible | Allows implementation to bypass requirement without criteria. |
| 5 | `INCOMPLETE` | Incomplete Requirement | High | 3 | TBD, etc., and/or, including but not limited to | Unresolved placeholders or non-exhaustive lists. |
| 6 | `UNCLEAR_REFERENCE` | Unclear Reference | Medium | 2 | it, this, they, the system | Pronouns create ambiguity regarding the antecedent subject. |
| 7 | `PASSIVE_NO_ACTOR` | Passive Voice (No Actor) | Low | 1 | shall be validated, is sent | Hides which actor or component performs the action. |
| 8 | `SUBJECTIVE_TERMS` | Subjective Terms | Medium | 2 | beautiful, attractive, clean, world-class | Non-quantifiable quality claims that cannot be tested. |
| 9 | `COMPOUND_REQUIREMENT` | Compound Requirement | Medium | 2 | multiple "shall/must" or multiple "and" | Combines distinct obligations; should be split. |
| 10 | `MISSING_MEASURE` | Missing Measure | High | 3 | response time, uptime, secure | Non-functional attributes stated without digits or units. |
| 11 | `UNIVERSAL_QUANTIFIERS` | Universal Quantifier | Low | 1 | all, every, always, never, none | Absolute terms that are untestable or overly broad. |
| 12 | `TIME_AMBIGUITY` | Time Ambiguity | Medium | 2 | soon, periodically, real-time | Temporal terms lacking explicit durations or intervals. |

---

## 📊 Scoring Formula & Rating Bands

- **Requirement Penalty**:
  $$\text{Penalty} = \min\left(\sum_{\text{findings}} \text{weight}, 10\right)$$
- **Requirement Score**:
  $$\text{Requirement Score} = 100 - (\text{Penalty} \times 10) \quad (0..100, \text{higher} = \text{clearer})$$
- **Overall Ambiguity Score** (shown to user):
  $$\text{Overall Ambiguity Score} = 100 - \text{Average}(\text{Requirement Scores}) \quad (0..100, \text{HIGHER} = \text{MORE AMBIGUOUS})$$

### Rating Bands:
- **0 - 20**: Clear
- **21 - 40**: Mostly Clear
- **41 - 60**: Needs Work
- **61 - 80**: Ambiguous
- **81 - 100**: Highly Ambiguous

---

## ⚙️ Environment Variables

| Variable | Description | Default / Example |
|----------|-------------|-------------------|
| `PORT` | Backend HTTP listening port | `5000` |
| `MONGODB_URI` | MongoDB connection URI | `mongodb://127.0.0.1:27017/srs_ambiguity_db` |
| `JWT_SECRET` | Secret key for JWT signing | `supersecretjwtkey_srs_ambiguity_detector_2026` |
| `CLIENT_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |
| `NODE_ENV` | Environment mode | `development` or `production` |
| `HOSTNAME` | Container instance hostname | `backend1`, `backend2`, `backend3` |

---

## 🚀 Setup & Execution Guide

### Option A: Running with Docker Compose (Recommended)

1. Ensure Docker Desktop is running.
2. Clone the repository and navigate to the project directory:
   ```bash
   cd srs-ambiguity-detector
   ```
3. Build and launch all services (3 backends, Nginx, MongoDB):
   ```bash
   docker compose up --build
   ```
4. Access the web application at `http://localhost`.
5. Seed demo user data into the running cluster:
   ```bash
   docker exec -it srs-backend1 npm run seed
   ```
   *Demo credentials*: `demo@example.com` / `Demo@1234`.

---

### Option B: Local Development without Docker

#### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
npm run seed  # Populates demo user data into local MongoDB
npm run dev
```

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🧪 Running Unit & Integration Tests

### Backend Tests (Jest + Supertest)
```bash
cd backend
npm test
```
*Executes 39 automated unit and integration tests covering auth, rule engine categories, scoring, deduplication, file upload parsing, and strict ownership checks.*

### Frontend Tests (Vitest + React Testing Library)
```bash
cd frontend
npm test
```
*Executes component unit tests covering severity badges, score badges, navbar states, and result views.*

---

## 📈 Load Testing (50 Concurrent Users)

To run the load test simulating 50 concurrent virtual users hitting the Nginx cluster for 30 seconds:

```bash
node loadtest/loadtest.js
```

### Sample Output:
```
====================================================
LOAD TEST RESULTS SUMMARY
====================================================
Total Completed Requests : 42150
Duration                 : 30 seconds
Requests / Second (RPS)  : 1405.00
p95 Latency              : 42 ms
Total Errors             : 0

X-Served-By Instance Traffic Distribution:
  - backend1: 14050 requests (33.3%)
  - backend2: 14050 requests (33.3%)
  - backend3: 14050 requests (33.3%)
====================================================
✅ LOAD TEST SUCCESS: 0 errors and p95 latency < 1.0s target met!
```

---

## 🔄 Failover Test Procedure

To verify high availability and automatic failover handling:

1. Launch the cluster with `docker compose up --build`.
2. Stop `backend2` container manually:
   ```bash
   docker stop srs-backend2
   ```
3. Refresh the application in your browser or run `node loadtest/loadtest.js`.
4. **Result**: Nginx automatically detects `backend2` failure via `proxy_next_upstream` and routes 100% of traffic to `backend1` and `backend3` without any 502/503 errors.

---

## 🌐 Deploying to Render

This project includes a ready-to-use Render Blueprint configuration (`render.yaml`).

1. Push your repository to GitHub.
2. In the Render Dashboard, click **New +** -> **Blueprint**.
3. Connect your repository (`Surya-Kiran22/cerso_task_2`).
4. Set the `MONGODB_URI` environment variable to your MongoDB Atlas connection string.
5. Click **Apply** to deploy both backend service and static frontend automatically.

---

## 📡 REST API Reference

| Method | Endpoint | Auth Required | Description | Sample Request Payload |
|--------|----------|---------------|-------------|------------------------|
| `POST` | `/api/auth/register` | No | Register new user account | `{ "name": "Jane", "email": "jane@example.com", "password": "password123" }` |
| `POST` | `/api/auth/login` | No | Login and receive JWT token | `{ "email": "jane@example.com", "password": "password123" }` |
| `GET` | `/api/auth/me` | Yes | Get authenticated user profile | Header: `Authorization: Bearer <token>` |
| `POST` | `/api/analyze` | Yes | Analyze SRS text & save result | `{ "title": "SRS v1", "text": "REQ-1: System shall be fast." }` |
| `POST` | `/api/upload` | Yes | Extract text from uploaded file | Multipart `file`: `.txt`, `.pdf`, `.docx` |
| `GET` | `/api/analyses` | Yes | Paginated list of user's past analyses | `?page=1&limit=10` |
| `GET` | `/api/analyses/:id` | Yes | Full details of specific analysis (Owner only) | URL param `:id` |
| `DELETE` | `/api/analyses/:id` | Yes | Delete specific analysis (Owner only) | URL param `:id` |
| `GET` | `/api/dashboard/stats` | Yes | Aggregated dashboard metrics & chart data | Header: `Authorization: Bearer <token>` |
| `GET` | `/api/health` | No | Public health check & hostname | Response: `{ "status": "ok", "instance": "backend1" }` |

---

## 📷 Screenshots Section Placeholder

*(Include application screenshots here for documentation)*
- **Analyze Page & Live Counter**: `docs/screenshots/analyze.png`
- **Detailed Findings & Rewrites**: `docs/screenshots/results.png`
- **Analytics Dashboard**: `docs/screenshots/dashboard.png`
- **History List**: `docs/screenshots/history.png`

---

## ⚠️ Known Limitations

1. **Rule-Based Regex Engine**: Uses deterministic pattern matching; domain-specific acronyms or nuanced semantic ambiguity may require custom rules.
2. **English Language Only**: Natural language rule patterns are optimized for English SRS documents.

---

## 🚀 Future Improvements

- Add customizable organization rule sets (e.g. custom corporate terminology dictionaries).
- Export analysis reports to PDF / Excel formats.
- Integration with Jira and Confluence for automated requirement quality gates.
