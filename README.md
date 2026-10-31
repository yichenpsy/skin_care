# SelfGlow

SelfGlow is a skincare web application with a German-language interface. It combines a product shop with a skin quiz, AI image analysis, and a skincare assistant.

## Features and architecture

- Browse and filter products; view ingredients, reviews, and AI product explanations.
- Register and sign in; save a skin profile, wishlist, cart, and order history.
- Complete a skin quiz or upload an image for skin analysis and a generated glow preview.
- Chat with an assistant that retrieves products, applies product filters, and uses saved profile information. Signed-in users can save conversations.
- Use local weather as additional skincare context when location access and a weather API key are available.
- Create orders and send confirmation emails. The current checkout stores a payment-method value; it does not integrate a payment gateway.

The React frontend calls an Express API. Prisma connects the backend to PostgreSQL. The database uses pgvector for product and user-profile embeddings: numeric representations of text used to find semantically similar content. Chat retrieval includes semantic search, keyword fallback, filters, and AI reranking. AI skincare output is informational, not a medical diagnosis.

| Part | Technology / location |
| --- | --- |
| Web app | React, TypeScript, Vite, React Router, Tailwind CSS; `frontend/apps/web` |
| Shared UI | shadcn/ui and Radix components; `frontend/packages/ui` |
| Frontend workspace | npm workspaces and Turborepo; `frontend` |
| API | Node.js, Express, JWT authentication; `backend/src` |
| Database | PostgreSQL 15 with pgvector; `docker-compose.yml` |
| Schema and migrations | Prisma; `backend/prisma` |
| External services | OpenAI for AI features, Brevo for email, OpenWeather for weather |

## Requirements

- Node.js **22.12 or newer in the Node 22 series**, or another version supported by the installed dependencies. The frontend declares Node `>=20`, but its Vite dependency requires `^20.19.0 || >=22.12.0`.
- npm; the frontend declares `npm@10.9.2` in `frontend/package.json`.
- Docker with Docker Compose (`docker compose`). Docker runs the database; the frontend and backend run locally.
- Git and access to the repository. The SSH clone URL below requires a configured SSH key.
- Optional service credentials for AI and weather. **Brevo credentials are needed to complete registration and email-confirmed checkout.**

## First-time local setup

Run commands from the directory stated above each block. `skin_care` below is the folder created by cloning; use your own folder name if you chose a different one.

### 1. Clone and install

From the directory where you keep projects:

```bash
git clone git@gitlab.bht-berlin.de:project_bachelor/ss26/skin_care/skin_care.git
cd skin_care
```

If you already have this checkout, use it instead. From the project root, install backend dependencies:

```bash
cd backend
npm install
```

Then install the entire frontend workspace:

```bash
cd ../frontend
npm install
```

There is no need to install separately in `apps/web` or `packages/ui`.

### 2. Configure the backend

Create `backend/.env` in your editor. This is a file path, not a shell command. Start with:

```dotenv
DATABASE_URL="postgresql://selfglow_user:selfglow_password@localhost:5432/selfglow?schema=public"
JWT_SECRET="replace-with-your-own-random-secret"
PORT=5050
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-5-mini"
```

- The database user, password, and database name come from `docker-compose.yml`. `localhost:5432` is the database address exposed to your computer. If you change those settings, update `DATABASE_URL` too. `schema=public` selects the PostgreSQL schema.
- `JWT_SECRET` is a secret you choose for signing login tokens. Replace the example with a long random value. Changing it invalidates existing login tokens.
- `5050` is the backend's default port in `backend/src/app.js`. If you change it, update the frontend API address too.
- `gpt-5-mini` is the default chat model in the code. `OPENAI_MODEL` also controls product explanations, but not every AI feature; see [AI configuration](#ai-configuration).
- Leave `OPENAI_API_KEY` empty until you have a real key. A nonempty placeholder is treated as a configured key and causes failed API requests.

Do not commit `.env` files or service keys. Additional settings and their defaults are described under [Environment configuration](#environment-configuration).

### 3. Start and initialize the database

From the project root:

```bash
docker compose up -d db
docker compose exec db pg_isready -U selfglow_user -d selfglow
```

`db` is the service name in `docker-compose.yml`; `-d` runs it in the background. The readiness command uses the same database user and name as the Compose configuration. Wait until it reports that connections are accepted.

From `backend/`:

```bash
npx prisma migrate deploy
npx prisma generate
node prisma/import-products.js
```

`migrate deploy` applies the repository's existing migrations without creating new ones. `generate` creates the Prisma client used by the backend. The import reads `backend/db/data/final_products.csv`.

**The product import synchronizes the catalog:** it creates or updates products matched by name, brand, and category, then deletes products absent from the CSV, including associated wishlist items, cart items, reviews, embeddings, and AI explanations. Review the CSV and back up important data before re-running it against an existing database.

Do not use `npm run seed`: the current package script points to `prisma/seed.js`, which is absent. Use the import command above.

### 4. Optional: initialize semantic product search

After importing products, run this from `backend/` to load the existing vector export without making OpenAI requests:

```bash
npm run import:product-embeddings
```

The file is `backend/prisma/data/product-embeddings.json`. The script matches products by name, brand, and category, and skips missing or ambiguous matches. Check its imported/skipped counts. An OpenAI key is still needed to create a query embedding during semantic search.

If you changed the catalog or its searchable content, generate fresh vectors instead:

```bash
npm run embed:products
```

This requires a real `OPENAI_API_KEY`, processes all current products, replaces their existing vectors, and makes billable API requests. Without a key, chat uses keyword retrieval and fallback text. If semantic retrieval fails or finds no usable matches, the retrieval code also attempts keyword search.

### 5. Start the app

In one terminal, from the project root:

```bash
cd backend
npm run dev
```

In another terminal, from the project root:

```bash
cd frontend
npm run dev
```

| Service | Default local address |
| --- | --- |
| Frontend | http://localhost:5173 |
| Backend | http://localhost:5050 |
| PostgreSQL | `localhost:5432` |

Vite may choose another port if `5173` is occupied; read its terminal output. The backend explicitly allows local frontend origins on ports `5173` and `5174`. For another origin, set `FRONTEND_URL` and restart the backend.

## Environment configuration

### Backend: `backend/.env`

Restart the backend after changing these values.

| Variable | Default / purpose |
| --- | --- |
| `DATABASE_URL` | Required database connection; local example above matches Compose. |
| `JWT_SECRET` | Required for authenticated features; choose your own secret. |
| `PORT` | `5050`; backend HTTP port. |
| `JWT_EXPIRES_IN` | `7d`; lifetime of login tokens. |
| `FRONTEND_URL` | Frontend address used by auth code and added to allowed CORS origins. Auth code falls back to `http://localhost:5173`. |
| `BACKEND_URL` | Public backend address used by auth URL construction; otherwise inferred from the request. |
| `OPENAI_API_KEY` | Empty/unset disables AI-generated chat responses; image analysis and image generation require a valid key. |
| `OPENAI_MODEL` | `gpt-5-mini`; chat and product-explanation model. |
| `OPENAI_TIMEOUT_MS` | `20000`; chat API request timeout in milliseconds. |
| `OPENAI_MAX_OUTPUT_TOKENS` | `450`; default chat output-token limit; individual calls may override it. |
| `OPENAI_REASONING_EFFORT` | `minimal`; chat reasoning setting. Use a value supported by the chosen model. |
| `OPENAI_VERBOSITY` | `low`; chat verbosity setting. Use a value supported by the chosen model. |
| `OPENWEATHER_API_KEY` | Optional OpenWeather key; without it, the weather service returns no weather context. |
| `BREVO_API_KEY` | Brevo API credential used to send registration and order emails. |
| `BREVO_SENDER_EMAIL` | Sender address configured with Brevo. Code also accepts `MAIL_FROM_EMAIL` or `MAIL_USER` as a fallback. |
| `BREVO_SENDER_NAME` | `SelfGlow`; display name for outgoing emails. |
| `REQUIRE_EMAIL_VERIFICATION` | Only the exact value `true` blocks login for unverified users. Unset/`false` does **not** skip registration email sending. |

To enable email, add these to `backend/.env` with your own Brevo credential and configured sender address:

```dotenv
BREVO_API_KEY=""
BREVO_SENDER_EMAIL=""
BREVO_SENDER_NAME="SelfGlow"
REQUIRE_EMAIL_VERIFICATION=true
```

Registration always sends a verification email. If sending fails, the newly created user is deleted and registration returns an error. Checkout saves the order before sending email; if sending fails, it returns an error even though the order may already exist. Check order history or the database before retrying.

The current sending functions use Brevo's HTTP API. SMTP settings alone do not enable these flows.

### Frontend: `frontend/apps/web/.env.local`

Local setup needs no frontend environment file when the backend uses port `5050`. To use another backend, create this file:

```dotenv
VITE_API_URL=http://localhost:5050
```

This value comes from the backend address; replace it with your backend's actual URL. Include only the origin/base address, without `/api`, because API paths already contain that prefix. `frontend/apps/web/src/lib/api.ts` reads the value and defaults to `http://localhost:5050`.

Restart Vite after changes. Production builds need this value at build time. Variables prefixed with `VITE_` are exposed to the browser, so never put service secrets in them.

### AI configuration

The model settings currently come from different places:

| Feature | Model source |
| --- | --- |
| Chat | `OPENAI_MODEL`, default in `backend/src/services/chat/chat.constants.js` |
| Product explanations | `OPENAI_MODEL`, default in `backend/src/services/product-ai.service.js` |
| Embeddings | `text-embedding-3-small`, fixed in `backend/src/services/embedding.service.js` |
| Skin analysis / glow description | `gpt-4o`, fixed in `backend/src/routes/skinAnalysis.routes.js` |
| Glow image generation | `gpt-image-1`, fixed in the same route file |

Changing `OPENAI_MODEL` does not change the fixed models. The vector migrations use 1536 dimensions; changing the embedding model or dimensions requires compatible database changes and regenerated vectors. External AI calls can incur usage charges.

## Verify the setup

With the backend running, use a new terminal:

```bash
curl http://localhost:5050/api/test
curl http://localhost:5050/api/products
curl -X POST http://localhost:5050/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"Ich habe ölige Haut und suche etwas gegen Unreinheiten."}'
```

The first request should return `{"message":"API works"}`. It checks HTTP availability, not the database. The products request should return imported product data. The chat request should return a response; without an OpenAI key, expect fallback text rather than model-generated text.

Open the frontend and check that products load. With email configured, test registration, verification, and login. With an OpenAI key, test chat and image analysis separately because they use different models.

## Daily development

Start the database with `docker compose up -d db`, then run the backend and frontend as above. Dependency installation and catalog imports are not required on every start.

After pulling dependency or database changes, run the relevant install commands and, from `backend/`:

```bash
npx prisma migrate deploy
npx prisma generate
```

When intentionally changing the database schema, edit `backend/prisma/schema.prisma`, then run from `backend/`:

```bash
npx prisma migrate dev --name describe_your_change
```

`describe_your_change` is a name you choose, such as `add_product_field`; it labels the generated migration. Review and commit the schema and migration together. `migrate dev` is for development and can prompt for a database reset; use `migrate deploy` to apply committed migrations in deployment.

If your team's integration branch is `develop`, start work with:

```bash
git fetch origin
git switch develop
git pull --ff-only origin develop
git switch -c feature/your-task-name
```

If `develop` does not exist locally, use `git switch -c develop origin/develop` after fetching. `feature/your-task-name` is your chosen branch name; replace the last part with a short task description. Check or commit local changes before switching branches. Follow your team's current branch policy if it differs.

### Available commands

Run these in the directory listed:

| Directory | Command | Purpose |
| --- | --- | --- |
| `backend` | `npm run dev` | Start API with nodemon reload. |
| `backend` | `npm start` | Start API without reload. |
| `backend` | `npm run import:product-embeddings` | Load the committed product-vector export. |
| `backend` | `npm run export:product-embeddings` | Export database product vectors to the repository JSON file. |
| `backend` | `npm run embed:products` | Generate vectors for all products using OpenAI. |
| `backend` | `npm run generate:product-explanations` | Generate/cache AI product explanations. `-- --force` requests a refresh. |
| `backend` | `npm run backfill:skin-profile-facts` | Populate profile facts from existing quiz skin types, analyses, and reviews; extraction may call OpenAI. |
| `frontend` | `npm run dev` | Start frontend development tasks through Turbo. |
| `frontend` | `npm run build` | Run web TypeScript build and generate static assets. |
| `frontend` | `npm run lint` | Run workspace ESLint tasks. |
| `frontend` | `npm run typecheck` | Run workspace type-check scripts. |
| `frontend` | `npm run format` | Rewrite matching source files with Prettier. |
| `frontend` | `npm run preview --workspace=web` | Preview an existing web production build locally. |

`-- --force` passes `--force` through npm to the explanation script; use it only when you want to regenerate cached explanations. Review data-writing scripts before running them on a shared database. There is currently no automated test script in either package; the verification requests above are manual smoke checks.

## API overview

Routes are registered in `backend/src/app.js`; request handling is in `backend/src/routes` and controllers. Protected routes expect `Authorization: Bearer <token>`, where `<token>` is the JWT returned by login.

| Prefix | Main operations |
| --- | --- |
| `/api/auth` | Registration, login, email verification, profile and skin-profile updates |
| `/api/products` | Catalog, product details, AI explanations, authenticated fit assessment and recommendations |
| `/api/chat` | Chat (`POST /`), streamed chat (`POST /stream`), explanations (`POST /explain`) |
| `/api/skin-analysis` | Analyze an image, generate glow preview, save and manage analysis history |
| `/api/wishlist` | Authenticated wishlist operations |
| `/api/cart` | Authenticated cart operations and synchronization |
| `/api/reviews` | Public product reviews/ratings; authenticated review management |
| `/api/checkout` | Create an order; authenticated order history at `GET /orders` |
| `/api/chat-history` | Authenticated conversation storage and deletion |
| `/api/weather` | Weather context using `lat` and `lon` query parameters |

## Project layout

```text
skin_care/
├── docker-compose.yml                # Local database and persistent volume
├── backend/
│   ├── prisma/schema.prisma          # Database schema source
│   ├── prisma/migrations/            # Versioned database changes
│   ├── prisma/data/                  # Exported product embeddings
│   ├── prisma/*.js                   # Catalog and AI data scripts
│   ├── db/data/final_products.csv    # Source product catalog
│   └── src/
│       ├── app.js                    # API entry point and CORS
│       ├── routes/                   # API paths
│       ├── controllers/              # Request/response handling
│       ├── middleware/               # Authentication
│       └── services/                 # Business logic and integrations
└── frontend/
    ├── apps/web/src/                 # Pages, components, contexts, API helper
    ├── packages/ui/src/              # Shared UI components
    └── turbo.json                    # Workspace task configuration
```

CSV and vector-export files are source/import data, not the running database. PostgreSQL data is stored in the Docker volume `postgres_data` (usually prefixed by the Compose project name). Generated Prisma client files are under `backend/node_modules` and should not be edited manually.

## Build and deployment

- **Frontend:** from `frontend/`, set `VITE_API_URL` for the target backend and run `npm run build`. Publish `frontend/apps/web/dist`. The host must serve `index.html` for client-side routes; `frontend/apps/web/vercel.json` contains the Vercel rewrite.
- **Backend:** install dependencies including Prisma CLI for the migration/generation step, configure environment variables, run `npx prisma migrate deploy` and `npx prisma generate` from `backend/`, then start with `npm start`. The server binds to `0.0.0.0` and uses `PORT`.
- **Database:** use PostgreSQL with the pgvector extension available. The migrations create the extension. The included Compose credentials are local development values; configure separate credentials and persistent storage for a hosted environment.
- Set `FRONTEND_URL` and `BACKEND_URL` to the deployed addresses. The current CORS code also allows origins ending in `.vercel.app`; review this rule for your deployment.
- Import catalog/vector data deliberately; startup does not automatically seed it. Configure Brevo, OpenAI, and OpenWeather according to the features you need.

## Troubleshooting

| Symptom | Check / action |
| --- | --- |
| Database connection fails | Run `docker compose ps` and `docker compose logs db` from the root. Verify database readiness, `DATABASE_URL`, and whether port `5432` is occupied. |
| Credentials changed but database rejects them | Compose initialization credentials apply when the data directory is first created. Changing Compose values does not update users in an existing volume. Update the existing database credentials deliberately. |
| `vector` type or extension is missing | Check that the server supports pgvector. The included image is `pgvector/pgvector:pg15`; plain PostgreSQL may not include it. Apply migrations. |
| Prisma reports missing tables/columns or outdated client | From `backend/`, run `npx prisma migrate status`, apply committed migrations, and regenerate the client. Investigate failed migrations before retrying; do not reset a shared database. |
| Product list is empty | Confirm migrations succeeded and run the catalog import for the intended database. Read its deletion behavior before re-running it. |
| Chat returns fallback text or no recommendations | Check backend logs, the real API key, imported products, and vector import counts. Try a concrete skincare/product query. |
| Image analysis fails while chat works | Check API logs and account access to the fixed image/vision models; `OPENAI_MODEL` does not configure them. |
| Registration fails with an email error | Configure `BREVO_API_KEY` and a valid Brevo sender. `REQUIRE_EMAIL_VERIFICATION=false` does not disable registration email. |
| Checkout reports an email error | The order may already be saved. Check existing orders before submitting again, then fix the mail configuration. |
| Frontend cannot reach the API | Check the backend port and `VITE_API_URL`; restart Vite after editing its environment file. For hosted builds, rebuild with the correct value. |
| CORS error | Match `FRONTEND_URL` to the browser's exact origin, including port, and restart the backend. |
| Weather is unavailable | Check `OPENWEATHER_API_KEY`, browser location permission, and that latitude/longitude are available. |

To stop the local database without deleting its data, run from the root:

```bash
docker compose stop db
```

`docker compose down` also retains the named database volume. Adding `-v` deletes it and its database contents; do not use that option unless you intend to discard the local data.
