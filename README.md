# Generate Utility Invoice PDFs

Hosted on [GitLab](https://gitlab.com/stantonmatthewj/Boletas).
The site is published at https://stantonmatthewj.gitlab.io/Boletas/ (capital `B`).

## CI and Pages

`.gitlab-ci.yml` builds merge requests and deploys pushes to `main` with the
`ci-public` Docker runner and Node.js 20, matching the previous GitHub build.
The Pages build runs `npm ci` and `npm run build -- --env publicPath=/Boletas/`,
then publishes `dist/` as `public/`. The base path covers scripts, PDF templates,
client stamp images and the fallback stamp. Local builds default to `/`.
The `.env` files contain only historical base-path values; Webpack's
`--env publicPath=...` option selects the build's base path.

## If moving back to GitHub

`.github/workflows/deploy.yml` is the inactive GitHub version and is preserved
unchanged. Keep it in sync by hand if switching back. Restore the GitHub remote
as `origin` and enable GitHub Actions/Pages; the retained workflow builds and
publishes `dist/` to `gh-pages`. Set its build command to
`npm run build -- --env publicPath=/Boletas/` for the project site's base path,
then point public links back to https://stantonmatt.github.io/Boletas/.
