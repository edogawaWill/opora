# OPORA

**OPORA – Symptom & Disease Management System** is an academic web application for recording patient-reported symptoms, exploring curated health information, and supporting communication between patients and authorized healthcare professionals.

The application provides separate Patient, Healthcare Professional (HCP), and Administrator workspaces. It uses role-based access controls and patient consent checks to restrict access to protected patient information. OPORA is an educational software project; it is not a substitute for professional medical care or a confirmed diagnosis.

## Project objectives

- Let patients keep symptom records and review their health history and trends.
- Provide guided symptom assessments whose results are informational, not diagnostic.
- Present curated disease and symptom information for health education.
- Support appointment and message workflows between patients and healthcare professionals.
- Give healthcare professionals access only to records shared with them under the application's consent and authorization rules.
- Provide administrators with user-management, HCP verification, disease-catalogue management, and audit-history tools.

## Main features

- Patient registration, email verification, profile management, symptom records, trends, health history, and assessment history.
- Guided assessments with server-side validation, informational condition matching, and safety guidance.
- Curated disease directory and disease details.
- Appointment booking and management.
- Patient/HCP messaging.
- Patient-granted HCP consent and consent-scoped patient access.
- HCP profile and verification workflows.
- Administrator tools for patient and HCP accounts, HCP review, curated disease information, and administrative audit records.
- Shared authentication email delivery through Resend, with development-only email testing options.

## User roles

### Patient

Patients can manage their profile, record and review symptoms, use guided assessments, browse educational disease information, manage appointments, communicate with healthcare professionals, and control patient-granted access where the application supports it.

### Healthcare Professional

Healthcare professionals can manage their profile and appointments, communicate with patients, and access patient information only when authorized and covered by the required active patient consent. HCP accounts are subject to the application's verification and account-status workflow.

### Administrator

Administrators can manage patient accounts, review healthcare professional applications, maintain the curated disease catalogue, and review administrative audit activity.

## Application routes

The route groups in `app/` expose these application areas (dynamic IDs are shown in brackets):

| Area | Routes |
| --- | --- |
| Public and authentication | `/`, `/login`, `/signup`, `/signup/healthcare-professional`, `/verify-email`, `/forgot-password`, `/reset-password` |
| Patient | `/patient`, `/patient/profile`, `/patient/history`, `/patient/assessment`, `/patient/assessment/history`, `/patient/assessment/[assessmentId]`, `/patient/diseases`, `/patient/diseases/[diseaseId]`, `/patient/appointments`, `/patient/messages`, `/patient/messages/[userId]` |
| Healthcare Professional | `/hcp`, `/hcp/status`, `/hcp/profile`, `/hcp/patients`, `/hcp/patients/[patientId]`, `/hcp/appointments`, `/hcp/appointments/[appointmentId]`, `/hcp/messages`, `/hcp/messages/[userId]` |
| Administrator | `/admin`, `/admin/patients`, `/admin/patients/[patientId]`, `/admin/hcps`, `/admin/hcps/[hcpId]`, `/admin/diseases` |

Protected workspaces require authentication and the appropriate role and access checks.

## Technology stack

- **Application:** Next.js 16 App Router, React 19, and TypeScript.
- **Styling and icons:** Tailwind CSS 4, PostCSS, and Lucide React.
- **Authentication:** Better Auth with its Prisma adapter.
- **Data:** PostgreSQL, Prisma ORM 7, and the PostgreSQL (`pg`) driver adapter.
- **Email:** Resend for configured email delivery; optional Mailpit capture during local development.
- **Photo curation:** Unsplash API tooling for curated photo selection. The access key is used by the curation scripts, not needed to run the normal application from its curated assets.
- **Quality checks:** ESLint, TypeScript, and Node.js built-in test runner.

## Prerequisites

- Node.js **20.9.0 or newer** (the installed Next.js package declares `>=20.9.0`).
- npm, which is used with the committed `package-lock.json`.
- A PostgreSQL database accessible to the application.
- Local environment values for the database and Better Auth. Email-provider configuration is needed for the selected email-delivery mode; Unsplash access is only needed to run the photo-curation tooling.
- For the optional Mailpit workflow, a separately running Mailpit instance reachable at the local API address described in `.env.example` and below. This repository does not include a Mailpit service definition.

## Installation

Clone the repository and change into its root directory, then install the locked dependencies:

```bash
npm ci
```

Create a local `.env` file from the safe template. In PowerShell:

```powershell
Copy-Item .env.example .env
```

On macOS, Linux, or Git Bash:

```bash
cp .env.example .env
```

Edit `.env` locally and supply appropriate values. Do not commit `.env`; the repository's `.gitignore` excludes environment files while allowing the root `.env.example` template.

## Environment configuration

The root `.env.example` is the authoritative list of supported variable names. It currently documents:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection used by the application and Prisma CLI. |
| `BETTER_AUTH_SECRET` | Secret used by Better Auth. Keep it private and use a strong value. |
| `BETTER_AUTH_URL` | Base URL for the Better Auth application. |
| `UNSPLASH_ACCESS_KEY` | Used by the Unsplash photo-curation scripts. |
| `RESEND_API_KEY` | Used for authentication email delivery through Resend. |
| `RESEND_FROM_EMAIL` | Sender address used for authentication emails. |
| `RESEND_TEST_TO_EMAIL` | Optional development-only recipient override when using Resend. It applies when `NODE_ENV=development`. |
| `OPORA_EMAIL_TRANSPORT` | Set to `mailpit` for the supported local Mailpit email-capture path when `NODE_ENV=development`. |

Do not paste real credentials into this README or commit them. In Mailpit mode, OPORA sends to the actual synthetic account email rather than using `RESEND_TEST_TO_EMAIL`. The application sends authentication email to Mailpit at `http://127.0.0.1:8025/api/v1/send`; the Mailpit user interface is available at `http://127.0.0.1:8025` when the local service is running.

## PostgreSQL and Prisma setup

1. Create or select a PostgreSQL database for the local development environment.
2. Set `DATABASE_URL` in `.env` to that database's PostgreSQL connection string. The connection must specify a database name and explicit port. Keep credentials private.
3. Generate the Prisma Client:

   ```bash
   npx prisma generate
   ```

4. Apply the committed migrations to the configured database:

   ```bash
   npx prisma migrate deploy
   ```

Prisma reads `prisma/schema.prisma` and migrations from `prisma/migrations/`, as configured in `prisma.config.ts`. The configuration loads `.env` and includes a guard against targeting OPORA's reserved assessment test database. Always verify the effective database target before running database commands. Do not point local development at a production database.

The repository also defines this optional local-development command to insert entries from the included HPO symptom catalogue:

```bash
npm run symptoms:seed
```

This command writes to the configured database, only accepts a validated development database target, inserts missing symptom names, and does not update existing symptom records. Run it only when the development dataset is needed and after confirming the target. It is not required merely to install dependencies.

An initial administrator can be provisioned with:

```bash
npm run admin:provision
```

This is an interactive database-writing operation. The script requires the development database guard to pass, `OPORA_EMAIL_TRANSPORT=mailpit`, Better Auth configuration, a sender address, and a reachable local Mailpit service. It asks for account details and requires an explicit confirmation phrase before creating an account. Run it only when an initial administrator is needed and after confirming the target database.

## Run the application

After installation, environment configuration, Prisma Client generation, and migration setup, start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The application routes include public landing and authentication pages, followed by Patient, HCP, and Admin workspaces after authentication and authorization.

For a production build and local production server:

```bash
npm run build
npm start
```

## Tests and checks

There is no `test` script in `package.json`. Run the project's Node.js test files directly:

```bash
node --test lib/*.test.mjs scripts/*.test.mjs
```

Other available checks are:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

The project also defines `npm run unsplash:curate -- "search query" [result count]` and `npm run unsplash:commit-selections -- <photo-id> [photo-id ...]`. These are photo-curation utilities, not routine application startup commands. They require `UNSPLASH_ACCESS_KEY`; the selection command contacts Unsplash and records its event ledger in `data/unsplash-selection-events.json`. Review the script behavior before running either command.

## Security considerations

- Keep `.env` and all secret values outside version control. Use `.env.example` only as a names-and-setup template.
- Use a strong Better Auth secret and protect database and email-provider credentials.
- Confirm the configured database target before running Prisma migrations, seed utilities, or administrator provisioning. The Prisma configuration and database utilities include protection for a reserved assessment test target; do not weaken or bypass those guards.
- Preserve server-side authentication, role authorization, and patient-consent checks. A visible page or link is not an authorization boundary.
- Use synthetic data for development and demonstrations. Do not place real patient records, assessment answers, or credentials in source files, screenshots, logs, test fixtures, or public repositories.
- Configure email and deployment services separately for each environment. The repository does not establish production hosting, provider verification, or operational policies.

## Medical disclaimer

OPORA presents patient-reported information and educational content to support discussion with a qualified healthcare professional. Guided assessment results are informational and are **not a confirmed diagnosis**, clinical decision, or substitute for professional evaluation. Users with urgent or worsening symptoms should seek appropriate medical care or emergency services. Do not use this academic project as an emergency-response service.

## Academic project information

OPORA is documented here as an academic software project titled **OPORA – Symptom & Disease Management System**. The repository does not specify institution, course code, supervisor, contributor list, publication license, or formal citation details. Add the official academic and attribution information before submission or publication if required by the course or institution.
