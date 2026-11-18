# Generate Utility Invoice PDFs

Hosted on [GitHub](https://github.com/StantonMatt/Boletas).
The site is published at https://stantonmatt.github.io/Boletas/ (capital `B`).

## CI and Pages

`.github/workflows/deploy.yml` builds pull requests and deploys pushes to `main`
on GitHub-hosted Ubuntu runners with Node.js 20.
The Pages build runs `npm ci` and `npm run build -- --env publicPath=/Boletas/`,
then publishes `dist/` to the `gh-pages` branch. GitHub Pages serves that branch.
The base path covers scripts, PDF templates,
client stamp images and the fallback stamp. Local builds default to `/`.
The `.env` files contain only historical base-path values; Webpack's
`--env publicPath=...` option selects the build's base path.

GitLab is a read-only mirror with CI/CD disabled.
