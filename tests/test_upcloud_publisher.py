"""Reject archive confusion and secret-bearing images before Docker receives them."""

import importlib.util
import io
import json
import tarfile
from pathlib import Path
from types import SimpleNamespace

import pytest

SPEC = importlib.util.spec_from_file_location(
    "demo_publisher", Path(__file__).parents[1] / "deploy/upcloud/publish_server.py"
)
publisher = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(publisher)
SHA = "a" * 40


def archive(tmp_path, *, env=None, layer_file="app/app.py", manifest=None, extra=None, family="bluewatch"):
    layer = io.BytesIO()
    with tarfile.open(fileobj=layer, mode="w") as output:
        item = tarfile.TarInfo(layer_file)
        item.size = 2
        output.addfile(item, io.BytesIO(b"ok"))
    config = {
        "architecture": "amd64",
        "os": "linux",
        "config": {
            "User": "bluewatch" if family == "bluewatch" else "node",
            "WorkingDir": "/app",
            "Env": env or ["PATH=/usr/bin"],
            "Labels": {"org.opencontainers.image.revision": SHA, "com.wicflow.family": family},
        },
        "rootfs": {"diff_ids": []},
    }
    files = {
        "config.json": json.dumps(config).encode(),
        "layer.tar": layer.getvalue(),
        "manifest.json": json.dumps(
            manifest
            or [{"Config": "config.json", "Layers": ["layer.tar"], "RepoTags": ["wicflow-" + family + ":" + SHA]}]
        ).encode(),
    }
    path = tmp_path / "image.tar.gz"
    with tarfile.open(path, "w:gz") as output:
        for name, body in files.items():
            item = tarfile.TarInfo(name)
            item.size = len(body)
            output.addfile(item, io.BytesIO(body))
        if extra:
            output.addfile(tarfile.TarInfo(extra))
    return path


@pytest.mark.parametrize("family", ["bluewatch", "preparedhome"])
def test_accepts_only_the_exact_family_and_source(tmp_path, family):
    path = archive(tmp_path, family=family)
    assert publisher.validate_archive(path, family, SHA)[0] == "wicflow-" + family + ":" + SHA
    with pytest.raises(AssertionError):
        publisher.validate_archive(path, family, "b" * 40)
    with pytest.raises(AssertionError):
        publisher.validate_archive(path, "preparedhome" if family == "bluewatch" else "bluewatch", SHA)


@pytest.mark.parametrize("extra", ["../outside", "/etc/ssh/authorized_keys", "config.json"])
def test_rejects_archive_path_escape_and_duplicates(tmp_path, extra):
    with pytest.raises(AssertionError):
        publisher.validate_archive(archive(tmp_path, extra=extra), "bluewatch", SHA)


def test_rejects_extra_tag(tmp_path):
    entry = {
        "Config": "config.json",
        "Layers": ["layer.tar"],
        "RepoTags": ["wicflow-bluewatch:" + SHA, "unrelated:latest"],
    }
    with pytest.raises(AssertionError):
        publisher.validate_archive(archive(tmp_path, manifest=[entry]), "bluewatch", SHA)


@pytest.mark.parametrize("env", [["ANTHROPIC_API_KEY=fixture"], ["PAGES_COOKIE_SECRET=fixture"]])
def test_rejects_secret_environment_in_image(tmp_path, env):
    with pytest.raises(AssertionError):
        publisher.validate_archive(archive(tmp_path, env=env), "bluewatch", SHA)


@pytest.mark.parametrize("filename", ["app/.env", "app/private.env", "root/.ssh/id_ed25519"])
def test_rejects_private_files_in_image_layers(tmp_path, filename):
    with pytest.raises(AssertionError):
        publisher.validate_archive(archive(tmp_path, layer_file=filename), "bluewatch", SHA)


def test_bounds_expanded_archive_before_load(tmp_path, monkeypatch):
    monkeypatch.setattr(publisher, "MAX_EXPANDED", 512)
    with pytest.raises(AssertionError):
        publisher.validate_archive(archive(tmp_path), "bluewatch", SHA)


@pytest.mark.parametrize("used,spent", [(1, 0), (0, 0.01), (4, 0.5)])
def test_used_prepared_quota_blocks_restart(monkeypatch, used, spent):
    monkeypatch.setattr(publisher, "read_health", lambda _: {"limits": {"usedToday": used, "spentTodayUsd": spent}})
    with pytest.raises(AssertionError):
        publisher.quota_zero("preparedhome")


def test_unused_quota_allows_restart(monkeypatch):
    monkeypatch.setattr(publisher, "read_health", lambda _: {"limits": {"usedToday": 0, "spentTodayUsd": 0}})
    assert publisher.quota_zero("preparedhome") == {"usedToday": 0, "spentTodayUsd": 0}


@pytest.fixture
def deployment(tmp_path, monkeypatch):
    root = tmp_path / "etc" / "bluewatch"
    root.mkdir(parents=True)
    config = {
        "services": {
            "app": {"container_name": "demo-bluewatch-api", "image": "old"},
            "video": {"container_name": "demo-bluewatch-video", "image": "video"},
        }
    }
    (root / "compose.json").write_text(json.dumps(config))
    (root / ".active").write_text(json.dumps({"images": {"app": "old", "video": "video"}}))
    (root / "private.env").write_text("PRIVATE_FIXTURE=unchanged\n")
    original = (root / "compose.json").read_bytes()
    monkeypatch.setattr(publisher, "ETC", root.parent)
    monkeypatch.setattr(publisher, "RELEASES", tmp_path / "releases")
    monkeypatch.setattr(publisher.shutil, "disk_usage", lambda _: SimpleNamespace(free=30 * 1024**3))
    monkeypatch.setattr(
        publisher, "validate_archive", lambda *_: ("candidate", {"config": {}, "rootfs": {"diff_ids": []}})
    )
    monkeypatch.setattr(
        publisher,
        "info",
        lambda name: (
            {"Architecture": "amd64", "Os": "linux", "RootFS": {"Layers": []}, "Config": {}, "Id": "new"}
            if name == "candidate"
            else {"State": {"Running": True}, "Image": "old", "Id": "original"}
        ),
    )
    commands = []
    backup = {
        "full_read_check": True,
        "download_decrypt_restore": True,
        "hash_mode_owner_mtime_match": True,
        "actual_image_restores": {"all_test_containers_stopped": True},
        "snapshot_id": "c" * 64,
    }

    def run(args, **_):
        commands.append(args)
        return SimpleNamespace(stdout=json.dumps(backup).encode())

    monkeypatch.setattr(publisher, "run", run)
    gates = []
    monkeypatch.setattr(publisher, "nft_gate", lambda _, create: gates.append(create))
    monkeypatch.setattr(publisher, "drain", lambda *_: None)
    monkeypatch.setattr(
        publisher,
        "stop",
        lambda *_: {"app": {"Id": "original", "Image": "old"}, "video": {"Id": "vid", "Image": "video"}},
    )
    with (root / ".publish.lock").open("a") as lock:
        yield SimpleNamespace(root=root, original=original, gates=gates, commands=commands, lock=lock, base=tmp_path)


def execute_fixture(deployment):
    publisher.deploy("bluewatch", SHA, publisher.digest(b"archive"), io.BytesIO(b"archive"), deployment.lock)


def test_failed_stop_preserves_operator_receipt_and_gate(deployment, monkeypatch):
    def failed_stop(*_):
        raise RuntimeError("Stop was not verified")

    monkeypatch.setattr(publisher, "stop", failed_stop)
    with pytest.raises(RuntimeError):
        execute_fixture(deployment)
    failure = json.loads(next((deployment.base / "releases").rglob("failure.json")).read_text())
    assert failure["operator_required"] and failure["ingress_gate_retained"]
    assert deployment.gates == [True]
    assert not any(command[:2] == ["systemctl", "start"] for command in deployment.commands)


def test_changed_candidate_state_prevents_prior_restart(deployment, monkeypatch):
    hashes = iter([{"ledger": "old"}, {"ledger": "changed"}])
    monkeypatch.setattr(publisher, "state_hashes", lambda _: next(hashes))
    starts = []

    def failed_start(_, image):
        starts.append(image)
        raise RuntimeError("Unhealthy candidate")

    monkeypatch.setattr(publisher, "start", failed_start)
    with pytest.raises(AssertionError):
        execute_fixture(deployment)
    assert starts == ["new"] and deployment.gates == [True]
    assert json.loads(next((deployment.base / "releases").rglob("failure.json")).read_text())["operator_required"]


def test_unchanged_failed_candidate_restores_prior_target(deployment, monkeypatch):
    monkeypatch.setattr(publisher, "state_hashes", lambda _: {"ledger": "old"})
    starts = []

    def start(_, image):
        starts.append(image)
        if image == "new":
            raise RuntimeError("Unhealthy candidate")

    monkeypatch.setattr(publisher, "start", start)
    with pytest.raises(RuntimeError):
        execute_fixture(deployment)
    assert starts == ["new", "old"] and deployment.gates == [True, False]
    assert (deployment.root / "compose.json").read_bytes() == deployment.original
    assert json.loads(next((deployment.base / "releases").rglob("failure.json")).read_text())["prior_target_restored"]
