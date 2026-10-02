# Local Voting Contract (Phase 9A)

`contracts/Voting.sol` is an identity-blind, local Hardhat contract. The deployer
chooses a voting-authority address; only that authority can register candidates,
change election state, and submit votes. The contract stores opaque `bytes32`
candidate IDs, their counts, and used opaque voter nullifiers. It contains no
student identity, contact, OTP, or password data and exposes no identity-to-
candidate mapping.

The backend will be responsible for student eligibility and issuing unique,
non-identifying nullifiers later. Do not use names, enrollment numbers, email
addresses, or hashes of those values directly as nullifiers. This phase does not
connect the contract to the backend.

From this directory, install dependencies if needed and compile locally:

```sh
npm install
npm run compile
```

Only the in-memory Hardhat network and the local `localhost` development network
are configured. No public network or real cryptocurrency is used.# Blockchain-Based Student Voting Management System

MCA Semester 3 project.

**Current status: Phase 7 (admin and student management).** The project includes
student enrollment and email verification, five-minute student sessions, a
demonstration election interface, admin authentication, and student registry
management. Actual voting and smart-contract logic are not implemented.

## Tech stack

| Part       | Tools                                                  |
| ---------- | ------------------------------------------------------ |
| Frontend   | React.js (Vite), React Router, Axios, CSS              |
| Backend    | Node.js, Express.js, MongoDB, Mongoose, JavaScript     |
| Blockchain | Solidity, Hardhat, ethers.js (local network only)      |

Rules for this project: MongoDB only, no MetaMask for students, no real
cryptocurrency, no mainnet deployment, no Docker, no TypeScript.

## Folder structure

```
student-voting-blockchain/
  frontend/     React app (pages, components, api client, styles)
  backend/      Express API (config, routes, controllers, models, middleware, utils)
  blockchain/   Hardhat workspace (contracts, scripts, test)
  README.md
  .gitignore
```

## Requirements

- Node.js 18 or newer (20 or 22 recommended) and npm
- A MongoDB database: local MongoDB Community Server, or a free MongoDB Atlas cluster

## Setup and run

Open three terminals from the project root.

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env        # Windows: copy .env.example .env
# edit .env and set MONGO_URI and SMTP settings
npm run seed
npm run create-admin        # one-time interactive setup; password input is hidden
npm run dev
```

The API starts on http://localhost:5000. Check it:

```bash
curl http://localhost:5000/api/health
```

Example response:

```json
{
  "status": "ok",
  "service": "student-voting-backend",
  "timestamp": "2026-01-01T10:00:00.000Z",
  "uptimeSeconds": 12,
  "database": "connected"
}
```

`database` is one of `connected`, `connecting`, `disconnected`, `disconnecting`
or `not_configured` (MONGO_URI is empty). The API keeps running even if MongoDB
is unavailable, so you can always see the reason in this field and in the
terminal log.

The development seed is safe to run repeatedly. It upserts four fictional MCA
students (three eligible and one ineligible) and one scheduled sample election.
All seed email addresses use the reserved `.test` domain.

### API and model checks

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| `GET` | `/api/students` | List students, sorted by enrollment number |
| `GET` | `/api/elections` | Protected list of active elections |
| `POST` | `/api/students/verify` | Check an enrollment number for MCA voting eligibility |
| `POST` | `/api/students/send-otp` | Send an OTP to the student's registered email |
| `POST` | `/api/students/verify-otp` | Verify the emailed OTP |
| `GET` | `/api/session/test` | Protected temporary-session check |
| `POST` | `/api/session/logout` | Destroy the temporary session |
| `POST` | `/api/admin/auth/login` | Admin login using username/email and password |
| `GET` | `/api/admin/auth/me` | Protected admin session check |
| `POST` | `/api/admin/auth/logout` | Destroy the admin session |
| `GET` | `/api/admin/students` | Protected student registry |
| `POST` | `/api/admin/students` | Add a student |
| `PATCH` | `/api/admin/students/:studentId` | Edit student fields or eligibility |
| `DELETE` | `/api/admin/students/:studentId` | Delete an unvoted, non-candidate student |
| `GET` | `/api/admin/elections` | Protected election management list |
| `POST` | `/api/admin/elections` | Create a draft or scheduled election |
| `PATCH` | `/api/admin/elections/:electionId` | Edit a draft or scheduled election |
| `POST` | `/api/admin/elections/:electionId/activate` | Activate within its date window |
| `POST` | `/api/admin/elections/:electionId/end` | End an active election |
| `GET` | `/api/admin/elections/:electionId/eligible-students` | Eligible MCA student choices |
| `GET` | `/api/admin/elections/:electionId/candidates` | Candidates assigned to an election |
| `POST` | `/api/admin/elections/:electionId/candidates` | Assign an existing student as a candidate |
| `GET` | `/api/elections/active` | Protected active election details |
| `GET` | `/api/elections/:electionId` | Protected details for an active election |
| `GET` | `/api/elections/:electionId/candidates` | Protected candidates for an active election |

Verification requests use `{ "enrollmentNo": "..." }`; OTP verification also
requires `{ "otp": "123456" }`. The server sends email only to the address in
the matched MongoDB student record. OTP values are HMAC-hashed in MongoDB,
expire after `OTP_EXPIRY_MINUTES` (5 minutes by default), allow five attempts,
and enforce a 30-second resend cooldown. Successful verification removes the
hash and retains only an expiring cooldown marker. Set `OTP_HASH_SECRET` to a
long random secret so a pending code remains verifiable across backend restarts.

Successful OTP verification creates a five-minute session and sets an HttpOnly
cookie. The session record contains only the student reference, authenticated
flag, token hash, creation time, and expiry. Protected requests check MongoDB
expiry on the server; refreshing the dashboard revalidates the same cookie and
does not extend the session. Logout deletes the record. No voting action is
available in this phase.

OTP delivery requires valid SMTP settings. From `backend/`, run `npm test` with
`MONGO_URI` configured to check model validation, enrollment checks, and OTP
verification. Tests stub the email sender, so they do not send real email.
Without `MONGO_URI`, the integration tests are reported as skipped.

`npm run create-admin` connects to MongoDB and prompts for a username, email,
and hidden password. It is first-admin-only and refuses to overwrite an existing
admin. Passwords are bcrypt-hashed before storage. Admin login is rate-limited;
sessions use an HttpOnly cookie and a hashed token stored server-side. Admins
can view student eligibility and `hasVoted` status, but cannot edit `hasVoted`.
Deleting students who have voted or are registered as candidates is rejected.
Election transitions are constrained: only draft/scheduled elections can be
edited, scheduled elections activate only between their start/end times, and
only active elections can end. Candidates must be existing eligible MCA
students and cannot be duplicated within one election. Candidate management
closes when an election is active.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. In development, Vite forwards `/api` requests to
the backend on port 5000, so no CORS setup is needed.

Routes:

| URL              | Page                 |
| ---------------- | -------------------- |
| `/`              | Home (shows API and MongoDB status) |
| `/verify`        | Enrollment verification |
| `/verify/otp`    | OTP verification (requires the active enrollment flow) |
| `/dashboard`     | Protected student dashboard |
| `/election`      | Protected election details |
| `/candidates`    | Protected sample candidate cards |
| `/vote/confirm`  | Protected candidate confirmation demo |
| `/vote/success`  | Protected demonstration completion; no vote is recorded |
| `/session-expired` | Restart verification after session expiry |
| `/admin/login`   | Admin sign in |
| `/admin/dashboard` | Protected admin overview |
| `/admin/students` | Protected student management |
| `/admin/elections` | Protected election and candidate management |

### 3. Blockchain (optional in Phase 1)

```bash
cd blockchain
npm install
npm test            # runs the placeholder test on Hardhat's in-memory network
npm run check       # prints network info to confirm ethers.js works
npm run node        # optional: starts a local chain on http://127.0.0.1:8545
```

No voting contract exists yet, so there is nothing to compile or deploy.
Hardhat's test accounts are fake and hold fake ETH.

## Environment variables

### backend/.env

| Variable     | Required | Description |
| ------------ | -------- | ----------- |
| `MONGO_URI`  | Yes      | MongoDB connection string for the `student_voting` database. Local: `mongodb://127.0.0.1:27017/student_voting`. Atlas: `mongodb+srv://<user>:<password>@<cluster>/student_voting` |
| `PORT`       | No       | API port. Default `5000` |
| `CLIENT_URL` | No       | Frontend origin for CORS. Default `http://localhost:5173` |
| `SMTP_HOST` | Yes for OTP | SMTP server hostname |
| `SMTP_PORT` | Yes for OTP | SMTP server port; port `465` uses TLS |
| `SMTP_USER` | Yes for OTP | SMTP account and sender address |
| `SMTP_PASS` | Yes for OTP | SMTP account password or app password |
| `OTP_EXPIRY_MINUTES` | No | OTP validity period. Default `5` |
| `OTP_HASH_SECRET` | Recommended | Long random secret used to HMAC OTPs across backend restarts |

### frontend/.env (optional)

| Variable       | Description |
| -------------- | ----------- |
| `VITE_API_URL` | Only needed if the API is not proxied. Default is `/api` |

Never commit a real `.env` file. `.gitignore` already excludes it.

## Troubleshooting

- **Home page says "Backend not reachable":** start the backend first and check it uses port 5000.
- **MongoDB shows "MONGO_URI not set":** create `backend/.env` from `.env.example` and restart the backend.
- **MongoDB shows "Not connected":** check the connection string, that MongoDB is running (local) or that your IP is allowed in Atlas (cloud).
- **Port already in use:** change `PORT` in `backend/.env` and update the proxy target in `frontend/vite.config.js`.

## Database models

The backend defines `Student`, `Admin`, `Election`, `Candidate`, and `Vote`
Mongoose models. Candidate references are checked against existing students and
elections; vote references are checked against existing candidates and
elections. Admin records contain a `passwordHash` only, never a plaintext
password. Votes contain no student identity or OTP data.
