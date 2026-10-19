#!/usr/bin/python3
"""Root-owned forced command for one demo's immutable image releases."""

from __future__ import annotations

import argparse
import datetime
import fcntl
import hashlib
import json
import os
import re
import shutil
import stat
import subprocess
import sys
import tarfile
import time
from pathlib import Path, PurePosixPath

ETC = Path("/etc/hackathon-demos")
CODE = Path("/opt/hackathon-demos")
RELEASES = Path("/srv/hackathon-demo-releases")
MAX_ARCHIVE = 512 * 1024**2
MAX_EXPANDED = 1536 * 1024**2
RESERVE = 8 * 1024**3
FAMILIES = {"bluewatch": ("93", "/api/health"), "preparedhome": ("94", "/api/v1/health")}


def run(args, **kwargs):
    return subprocess.run(args, check=True, capture_output=True, **kwargs)


def info(name):
    return json.loads(run(["docker", "inspect", name]).stdout)[0]


def digest(data):
    return hashlib.sha256(data).hexdigest()


def write(path, value):
    temporary = path.with_suffix(".pending")
    with temporary.open("x") as stream:
        json.dump(value, stream, indent=2)
        stream.write("\n")
        stream.flush()
        os.fsync(stream.fileno())
    temporary.chmod(0o600)
    temporary.replace(path)


def validate_archive(path, family, source):
    tag = "wicflow-" + family + ":" + source
    with tarfile.open(path) as archive:
        seen, total = set(), 0
        for member in archive:
            name = PurePosixPath(member.name)
            assert not name.is_absolute() and ".." not in name.parts
            assert member.isfile() or member.isdir()
            assert str(name) not in seen
            seen.add(str(name))
            total += member.size
            assert total <= MAX_EXPANDED and len(seen) < 10000
        manifest = json.load(archive.extractfile("manifest.json"))
        assert len(manifest) == 1 and manifest[0]["RepoTags"] == [tag]
        if "index.json" in seen:
            index = json.load(archive.extractfile("index.json"))
            assert len(index["manifests"]) == 1
            annotations = index["manifests"][0].get("annotations", {})
            assert annotations.get("io.containerd.image.name") == "docker.io/library/" + tag
            assert annotations.get("org.opencontainers.image.ref.name") == source
        config = json.load(archive.extractfile(manifest[0]["Config"]))
        assert config["architecture"] == "amd64" and config["os"] == "linux"
        actual = config["config"]
        users = ("bluewatch", "10001", "10001:10001") if family == "bluewatch" else ("node", "1000", "1000:1000")
        assert actual["User"] in users and actual.get("WorkingDir") == "/app"
        assert actual.get("Labels", {}).get("org.opencontainers.image.revision") == source
        assert actual.get("Labels", {}).get("com.wicflow.family") == family
        assert not any(
            any(token in row.split("=", 1)[0].upper() for token in ("API_KEY", "SECRET", "PASSWORD", "TOKEN"))
            for row in actual.get("Env", [])
        )
        for layer in manifest[0]["Layers"]:
            with tarfile.open(fileobj=archive.extractfile(layer), mode="r|*") as contents:
                count, size = 0, 0
                for member in contents:
                    count += 1
                    size += member.size
                    assert count < 100000 and size <= MAX_EXPANDED
                    base = PurePosixPath(member.name).name
                    assert base not in (".env", "private.env", "id_rsa", "id_ed25519")
                    assert not (base.endswith(".env") and base != "example.env")
        return tag, config


def read_health(family):
    name = "demo-" + family + "-api"
    if family == "bluewatch":
        command = [
            "python",
            "-c",
            "import urllib.request;print(urllib.request.urlopen('http://127.0.0.1:8787/api/health',timeout=3).read().decode())",
        ]
    else:
        command = [
            "node",
            "-e",
            "fetch('http://127.0.0.1:8787/api/v1/health',{signal:AbortSignal.timeout(3000)})"
            ".then(r=>{if(!r.ok)throw Error();return r.text()}).then(console.log).catch(()=>process.exit(1))",
        ]
    result = json.loads(run(["docker", "exec", name, *command], timeout=5).stdout)
    assert result.get("ok") is True
    return result


def quota_zero(family):
    if family == "bluewatch":
        return None
    limits = read_health(family)["limits"]
    assert limits["usedToday"] == 0 and limits["spentTodayUsd"] == 0, "Used in-memory quota prevents restart"
    return limits


def nft_gate(family, create):
    table = "wicflow_publish_" + family
    if not create:
        run(["nft", "delete", "table", "bridge", table])
        return
    existing = run(["nft", "-j", "list", "tables"])
    assert table not in existing.stdout.decode(), "Prior deployment gate requires operator review"
    subnet = FAMILIES[family][0]
    script = (
        "table bridge " + table + " {\n chain ingress { type filter hook forward priority -210; policy accept;\n"
        " ip saddr 172.30." + subnet + ".2 ip daddr 172.30." + subnet + ".10 tcp dport 8787 ct state new drop\n }\n}\n"
    )
    run(["nft", "-f", "-"], input=script.encode())


def drain(family, current):
    pid = str(current["State"]["Pid"])
    quiet = 0
    for _ in range(35):
        assert info(current["Id"])["State"]["Pid"] == current["State"]["Pid"]
        output = run(
            ["nsenter", "-t", pid, "-n", "ss", "-Htn", "state", "established", "sport", "=", ":8787"], text=True
        ).stdout
        external = [
            line
            for line in output.splitlines()
            if not line.split()[-1].startswith(("127.0.0.1:", "[::1]:", "::ffff:127.0.0.1:"))
        ]
        quiet = quiet + 1 if not external else 0
        if quiet >= 3:
            return
        time.sleep(1)
    raise RuntimeError("Active requests did not drain; current release remains running")


def state_hashes(family):
    if family != "bluewatch":
        return {}
    root = Path("/srv/hackathon-demos-live") / family / "state"
    result = {}
    total = 0
    for path in sorted(root.rglob("*")):
        assert not path.is_symlink()
        if path.is_file():
            details = path.lstat()
            assert stat.S_ISREG(details.st_mode) and details.st_size < 64 * 1024**2
            total += details.st_size
            assert total < 128 * 1024**2 and len(result) < 5000
            with os.fdopen(os.open(path, os.O_RDONLY | os.O_NOFOLLOW), "rb") as stream:
                result[str(path.relative_to(root))] = digest(stream.read(64 * 1024**2))
        else:
            assert path.is_dir()
    return result


def stop(family, config):
    run(["systemctl", "stop", "wicflow-demo@" + family + ".service"], timeout=70)
    assert (
        run(
            ["systemctl", "show", "-p", "ActiveState", "--value", "wicflow-demo@" + family + ".service"], text=True
        ).stdout.strip()
        == "inactive"
    )
    result = {}
    for name, service in config["services"].items():
        value = info(service["container_name"])
        assert not value["State"]["Running"] and value["State"]["ExitCode"] != 137
        assert value["HostConfig"]["RestartPolicy"]["Name"] == "no" and value["Image"] == service["image"]
        result[name] = value
    return result


def start(family, image):
    run(["systemctl", "start", "wicflow-demo@" + family + ".service"], timeout=45)
    for _ in range(60):
        try:
            actual = info("demo-" + family + "-api")
            assert actual["State"]["Running"] and actual["Image"] == image
            read_health(family)
            return
        except (AssertionError, subprocess.CalledProcessError, json.JSONDecodeError):
            time.sleep(1)
    raise RuntimeError("Candidate did not become healthy")


def deploy(family, source, expected_archive, stream, lock):
    root = ETC / family
    assert shutil.disk_usage("/").free > RESERVE + 2 * 1024**3
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    release = RELEASES / family / (stamp + "-" + source[:12])
    release.mkdir(mode=0o700, parents=True, exist_ok=False)
    archive = release / "image.tar.gz"
    size, checksum = 0, hashlib.sha256()
    with archive.open("xb") as handle:
        while block := stream.read(1024**2):
            size += len(block)
            assert size <= MAX_ARCHIVE
            handle.write(block)
            checksum.update(block)
    assert checksum.hexdigest() == expected_archive
    tag, expected = validate_archive(archive, family, source)
    run(["docker", "load", "-i", str(archive)], timeout=120)
    loaded = info(tag)
    assert loaded["Architecture"] == "amd64" and loaded["Os"] == "linux"
    assert loaded["RootFS"]["Layers"] == expected["rootfs"]["diff_ids"]
    assert loaded["Config"] == expected["config"]
    image = loaded["Id"]
    config_path = root / "compose.json"
    original = config_path.read_bytes()
    active_bytes = (root / ".active").read_bytes()
    config = json.loads(original)
    before_env = (root / "private.env").read_bytes()
    run(["python3", str(CODE / "runtime-guard.py"), family])
    run(["python3", str(CODE / "policy-guard.py")])
    current = info(config["services"]["app"]["container_name"])
    assert current["State"]["Running"] and current["Image"] == config["services"]["app"]["image"]
    quota_zero(family)
    (release / "previous.compose.json").write_bytes(original)
    (release / "previous.active.json").write_bytes(active_bytes)
    write(release / "receipt.json", {"family": family, "source": source, "image": image, "state": "validated"})
    nft_gate(family, True)
    stopped = False
    candidate_started = False
    keep_gate = False
    old_hashes = None
    try:
        drain(family, current)
        limits = quota_zero(family)
        try:
            states = stop(family, config)
        except BaseException:
            keep_gate = True
            write(
                release / "failure.json",
                {
                    "operator_required": True,
                    "ingress_gate_retained": True,
                    "reason": "Previous target stop was not verified",
                },
            )
            raise
        stopped = True
        freeze = {
            "family": family,
            "at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "app_container_id": states["app"]["Id"],
            "app_image": states["app"]["Image"],
            "video_container_id": states["video"]["Id"],
            "video_image": states["video"]["Image"],
        }
        if family == "preparedhome":
            freeze["preparedhome_limits"] = limits
        write(root / ".deploy-freeze.json", freeze)
        backed_up = run(
            ["python3", str(CODE / "live-backup.py"), family, "--stopped", "--lock-fd", str(lock.fileno())],
            pass_fds=(lock.fileno(),),
            timeout=900,
        )
        backup = json.loads(backed_up.stdout)
        assert (
            backup["full_read_check"] and backup["download_decrypt_restore"] and backup["hash_mode_owner_mtime_match"]
        )
        assert backup["actual_image_restores"]["all_test_containers_stopped"]
        old_hashes = state_hashes(family)
        assert config_path.read_bytes() == original and (root / "private.env").read_bytes() == before_env
        config["services"]["app"]["image"] = image
        if family == "bluewatch":
            config["services"]["app"].setdefault("environment", {})["BLUEWATCH_BUILD"] = source
        active = json.loads(active_bytes)
        active["images"]["app"] = image
        active["publisher_source"] = source
        write(config_path, config)
        active["compose_sha256"] = digest(config_path.read_bytes())
        write(root / ".active", active)
        candidate_started = True
        start(family, image)
        assert (root / "private.env").read_bytes() == before_env
        quota_zero(family)
        receipt = {
            "family": family,
            "source": source,
            "image": image,
            "state": "healthy",
            "previous_image": states["app"]["Image"],
            "predeploy_snapshot_id": backup["snapshot_id"],
            "private_env_unchanged": True,
            "video_config_unchanged": True,
            "bluewatch_build_metadata_updated": family == "bluewatch",
            "prior_releases_retained": True,
        }
        write(release / "receipt.json", receipt)
        write(root / "publisher-current.json", receipt)
        archive.chmod(0o400)
    except BaseException:
        if keep_gate:
            raise
        if candidate_started:
            try:
                quota_zero(family)
                stop(family, config)
                assert state_hashes(family) == old_hashes
            except BaseException:
                keep_gate = True
                # Stop the supervisor even when its application health/quota is unreadable.
                run(["systemctl", "stop", "wicflow-demo@" + family + ".service"], timeout=70)
                write(
                    release / "failure.json",
                    {
                        "operator_required": True,
                        "ingress_gate_retained": True,
                        "reason": "Candidate state or quota is uncertain; prior writer stays stopped",
                    },
                )
                raise
        if stopped:
            config_path.write_bytes(original)
            (root / ".active").write_bytes(active_bytes)
            try:
                start(family, json.loads(original)["services"]["app"]["image"])
            except BaseException:
                keep_gate = True
                write(
                    release / "failure.json",
                    {
                        "operator_required": True,
                        "ingress_gate_retained": True,
                        "reason": "Previous target could not become healthy",
                    },
                )
                raise
        write(release / "failure.json", {"prior_target_restored": stopped, "new_release_not_active": True})
        raise
    finally:
        if not keep_gate:
            nft_gate(family, False)
    print(json.dumps(receipt))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--family", required=True, choices=FAMILIES)
    family = parser.parse_args().family
    assert os.geteuid() == 0
    os.umask(0o077)
    root = ETC / family
    command = os.environ.get("SSH_ORIGINAL_COMMAND", "")
    match = re.fullmatch(r"deploy ([0-9a-f]{40}) ([0-9a-f]{64})", command)
    assert command == "status" or match, "Only status or deploy <source SHA> <archive SHA256> is allowed"
    with (root / ".publish.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        assert (root / ".active").is_file()
        acceptance = json.loads((root / "live-receipt.json").read_text())
        assert acceptance["public_dns_tls_body_verified"] and acceptance["daily_backup_snapshot_id"]
        if command == "status":
            config = json.loads((root / "compose.json").read_text())
            current_path = root / "publisher-current.json"
            current = json.loads(current_path.read_text()) if current_path.exists() else {}
            print(
                json.dumps(
                    {
                        "family": family,
                        "image": config["services"]["app"]["image"],
                        "source": current.get("source"),
                        "health": read_health(family).get("ok") is True,
                        "publisher_ready": True,
                        "shell": False,
                        "arbitrary_config": False,
                    }
                )
            )
        else:
            deploy(family, *match.groups(), sys.stdin.buffer, lock)


if __name__ == "__main__":
    main()
