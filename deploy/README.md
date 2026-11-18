# deploy/

> **Since 18.11.2026:** the live compose file is the server's `/docker/preparedhome-demo/docker-compose.yml`, copied in `hostinger/`. The `compose*.yml` files here are guards and dated rollback records. Release steps are in [../DEPLOY.md](../DEPLOY.md); the line about the operator below is out of date.

- `compose.yml`: the base service (project `jx-preparedhome`, 1 GB, healthcheck, no ports).
- `compose.traefik.yml`: proxy case A (Traefik labels, external network, no host ports).
- `compose.port.yml`: proxy case B (publishes `127.0.0.1:8787` for Caddy or nginx).
- `pack.sh`: run on the dev PC. Builds `release/artifact/` (bundled server, web export, licensed samples, recorded results), which is committed so the production box never runs npm.

the operator deploys from GitHub with `../DEPLOY.md`. Nobody else SSHes into the server.
