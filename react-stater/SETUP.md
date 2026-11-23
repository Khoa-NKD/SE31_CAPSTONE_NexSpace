# NexSpace frontend setup

## Install and run

Use Node.js 22.12 or newer and npm. Run these commands inside `react-stater/`:

```sh
npm ci
npm run dev
```

Use `package-lock.json` with `npm ci` to reproduce the dependency versions used by
this application. Dependencies are downloaded during installation; `node_modules/`
is intentionally excluded from Git. No separate React Bits or Magic UI installer
is required.

Use the backend maintenance branch delivered with this frontend for maintenance
schedules, resource availability, and booking. Configure the local frontend and
backend using the project's existing environment instructions. Private credentials,
local configuration, and database contents are not distributed through Git.

## Included UI assets and effects

- React Bits implementations and styles are included in `src/components/react-bits/`,
  with upstream attribution and license files. Some components are retained as
  references and are only displayed where imported by the application.
- Aurora Text, Shine Border, the infinity loading indicator, and their styles are
  included in `src/components/ui/`.
- OGL, Motion, Lenis, Hugeicons, and Sonner are declared in `package.json` and pinned
  by `package-lock.json`.
- The approved logo artwork and shared icons are included under `src/components/`.
- Local font files and their licenses are included under `public/fonts/`; static
  application assets are included under `public/`.

For the full motion experience, use a modern browser with hardware acceleration
and WebGL enabled. The application intentionally reduces or replaces decorative
motion when reduced motion is enabled or WebGL is unavailable. This does not mean
a dependency is missing.

## Build check

```sh
npm run build
```
