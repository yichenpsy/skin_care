# SelfGlow frontend

The SelfGlow frontend is a React and TypeScript app built with Vite, Tailwind CSS, and shared shadcn/ui components. See the [project README](../README.md) for backend/database setup, environment variables, and troubleshooting.

## Workspace structure

- `apps/web`: the web app, including pages, contexts, and API calls.
- `packages/ui`: shared UI components exposed as `@workspace/ui`.
- `turbo.json`: task configuration for npm workspaces.

Use npm consistently with the workspace's `packageManager` setting (`npm@10.9.2`). Use Node 22.12+ in the Node 22 series, or another version supported by the installed dependencies; the installed Vite requires `^20.19.0 || >=22.12.0`.

## Install and run

From `frontend/`:

```bash
npm install
npm run dev
```

Install once at this workspace root; npm links `apps/web` and `packages/ui` automatically. Open the address printed by Vite, normally `http://localhost:5173`. Start the backend separately as described in the project README.

## Backend address

The API helper is `apps/web/src/lib/api.ts`. Its default backend address is `http://localhost:5050`.

To use another backend, create `apps/web/.env.local`:

```dotenv
VITE_API_URL=http://localhost:5050
```

Replace the value with your backend's base URL, without `/api`, because the request paths already include it. Restart the dev server after changing it. For a deployed site, set the variable before building; Vite embeds it in the browser bundle. Never put secrets in `VITE_` variables.

If you change the frontend origin, also configure the backend's `FRONTEND_URL` for CORS. Local origins on ports `5173` and `5174` are already allowed by the backend.

## Development commands

Run from `frontend/`:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start development tasks through Turbo. |
| `npm run build` | Run the web TypeScript build and Vite production build. |
| `npm run lint` | Run workspace ESLint tasks. |
| `npm run typecheck` | Run workspace TypeScript check scripts. |
| `npm run format` | Rewrite matching source files with Prettier. |
| `npm run preview --workspace=web` | Preview the existing production build locally. |

The build output is `apps/web/dist`. The web build runs `tsc -b` before Vite; run it as well as the workspace type-check command when verifying a release. Preview is a local inspection server. Deployment needs a static host with a fallback to `index.html` for React Router routes; `apps/web/vercel.json` includes the Vercel rewrite.

## Shared components

Existing shared components are in `packages/ui/src/components`. Import them using the workspace package name, which is declared in `packages/ui/package.json`:

```tsx
import { Button } from "@workspace/ui/components/button";
```

`@workspace/ui` is the package name, and `button` refers to `packages/ui/src/components/button.tsx`. Change the final component name when importing another component.

To generate a shadcn component, run from `frontend/`:

```bash
npx shadcn@latest add button -c apps/web
```

`button` is the component to add; replace it with the component you need. `-c apps/web` selects the app's shadcn configuration, which maps shared components to `packages/ui`. The command downloads/runs the generator and may modify existing files; review its changes before committing.

## Local product images

Product photos are served from `apps/web/public/images/products/`, so Vite includes them in both local development and production builds. The shared `ProductImage` component uses `src/lib/product-images.json` to map original catalog image URLs to local files. This also supports original image URLs already saved in carts and orders. Unknown or unavailable images use a local placeholder instead of contacting an external image server.

To download images for the current CSV catalog, run from the project root:

```bash
python3 scripts/download-product-images.py
```

The script uses Python's standard library and reads `backend/db/data/final_products.csv`; no running backend or database is needed. Filenames are derived from the source URL's SHA-256 hash, so they remain independent of database product IDs. It reuses existing downloads and retries failed URLs. `WORKERS = 6`, `TIMEOUT_SECONDS = 12`, and `MAX_IMAGE_BYTES = 10 * 1024 * 1024` in the script control parallel downloads, request timeout, and the 10 MiB per-image limit. Lower `WORKERS` if requests are being throttled.

Verified replacement sources are recorded in `scripts/product-image-sources.json`; each entry links the original image URL to its replacement image and product page. Review `scripts/product-image-download-report.json` for failed links and source provenance. Some external servers return errors or no longer host the image; those require a verified replacement URL in the CSV followed by another download. The script does not invent replacement product photos. Keep the downloaded files and generated manifest together when committing. Rebuild/redeploy the frontend to publish updated images; database image URLs do not need to change.
