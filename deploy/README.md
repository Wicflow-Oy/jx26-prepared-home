# deploy/

- `compose.yml`: the base service (project `jx-preparedhome`, 1 GB, healthcheck, no ports).
- `compose.traefik.yml`: proxy case A (Traefik labels, external network, no host ports).
- `compose.port.yml`: proxy case B (publishes `127.0.0.1:8787` for Caddy or nginx).
- `pack.sh`: run on the dev PC. Builds `release/artifact/` (bundled server, web export, licensed samples, recorded results), which is committed so the production box never runs npm.

the operator deploys from GitHub with `../DEPLOY.md`. Build sessions never SSH into the server.
