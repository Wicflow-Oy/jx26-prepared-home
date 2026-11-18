# Prepared Home deployment

## Hosting since 18.11.2026

- The public demo runs on Wicflow's Hostinger server (31.97.126.112, SSH alias `hostinger`, user root) from `/docker/preparedhome-demo`. Address: https://preparedhome.demo.wicflow.com.
- It moved there from the UpCloud server wicflow-clients-1 (87.58.148.131) on 18.11.2026. The UpCloud publisher, its `wicflow-demo@` unit and its daily backup were removed from that server the same day.
- The UpCloud release workflow (`.github/workflows/release-upcloud.yml`) is disabled. Its secrets `UPCLOUD_DEMO_SSH_KEY` and `UPCLOUD_DEMO_KNOWN_HOSTS` are deleted. Nothing deploys automatically; releases are manual (below).
- Two containers run: `app` (`preparedhome-demo-api`, the web app, the landing page and the API) and `video` (`preparedhome-demo-video`, nginx serving `/video` from `video/site/`). Traefik routes both on the `n8n_default` network and gets certificates from the `zerossl` resolver.
- Files in `/docker/preparedhome-demo`: `docker-compose.yml`, `private.env`, `video.nginx.conf` and `video/site/`. The app keeps no state on disk.
- [deploy/hostinger/](deploy/hostinger/) has copies of `docker-compose.yml` and `video.nginx.conf` from 18.11.2026. The files on the server are the ones in use. After a release, copy the server's `docker-compose.yml` back into the repo in a PR.
- `private.env` holds the app's secret settings. It lives only on the server, and in 1Password if the team keeps it there. Never print, copy or commit it. The compose file reads it by path only.
- Live on 18.11.2026: image `preparedhome-demo:db735b5e` (the tag is the image ID prefix), built from commit `a510b0dc`. `main` has newer commits that are not deployed, including a rebuilt `release/artifact/server.mjs`.

### Release a new version (manual)

Run these on a machine with Docker and the `hostinger` SSH alias, from a clean checkout of the commit on `main` you want to release.

1. The image only copies the committed `release/artifact/`. If `server/`, `app/` or `landing/` changed since the artifact was last built, run `bash deploy/pack.sh`, merge the new artifact to `main` through a PR, and release that commit.
2. Build the image. Tag it with the short commit.
   ```bash
   C=$(git rev-parse --short=8 HEAD); REV=$(git rev-parse HEAD)
   docker build --platform linux/amd64 --build-arg VCS_REF=$REV -t preparedhome-demo:$C .
   ```
3. Copy it to Hostinger. The tag goes with the image. If it arrives without a tag, tag it there with `docker tag <image-id> preparedhome-demo:$C`.
   ```bash
   docker save preparedhome-demo:$C | ssh hostinger docker load
   ```
4. Write down the current image tag. It is your rollback.
   ```bash
   ssh hostinger grep -n 'image: preparedhome-demo' /docker/preparedhome-demo/docker-compose.yml
   ```
5. Set the new image for `app`. This changes only that line; leave the `video` service alone.
   ```bash
   ssh hostinger "sed -i 's|image: preparedhome-demo:.*|image: preparedhome-demo:$C|' /docker/preparedhome-demo/docker-compose.yml"
   ```
6. Restart the app container only. The daily limits (live checks and spend) are kept in memory, so a restart sets today's counters back to zero. Prefer a time when `usedToday` and `spentTodayUsd` in `/api/v1/health` are 0.
   ```bash
   ssh hostinger 'cd /docker/preparedhome-demo && docker compose up -d app'
   ```
7. Check. The health check is `/api/v1/health`. There is no `/healthz`: that path returns the web app's page with status 200, so it proves nothing.
   ```bash
   ssh hostinger "docker inspect --format '{{.State.Health.Status}}' preparedhome-demo-api"   # healthy (within about a minute)
   ssh hostinger "docker image inspect --format '{{index .Config.Labels \"org.opencontainers.image.revision\"}}' preparedhome-demo:$C"   # the new commit
   curl -fsS https://preparedhome.demo.wicflow.com/api/v1/health                              # "ok":true and "keySet":true
   curl -sI https://preparedhome.demo.wicflow.com/ | grep -i -E '^HTTP|x-robots-tag'          # 200 and noindex, nofollow
   ```
   Then open https://preparedhome.demo.wicflow.com and https://preparedhome.demo.wicflow.com/video/ in a browser.

### Roll back

Put the previous image tag back into `/docker/preparedhome-demo/docker-compose.yml` (step 5 with the old tag), then run step 6 and step 7 again. The first rollback target is `preparedhome-demo:db735b5e`. Keep the previous image on the server until the new one has run for a while.

## Before 18.11.2026 (obsolete)

Obsolete since 18.11.2026: the UpCloud publisher and workflow are gone, and the demo runs on Hostinger as described above. Kept as history.

UpCloud deployment uses the scoped publisher described in [deploy/upcloud/README.md](deploy/upcloud/README.md). Release activation remains manual; pushes do not deploy.

The dated Hostinger deployment document and Compose copies are rollback records. Do not run those commands while the UpCloud writer is active. The active old Compose paths are guarded to prevent accidental source restart.
