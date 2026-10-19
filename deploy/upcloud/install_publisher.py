#!/usr/bin/python3
"""Install one reviewed forced key; live acceptance still gates every release."""

import argparse
import datetime
import fcntl
import hashlib
import json
import os
import re
import subprocess
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--family", choices=["bluewatch", "preparedhome"], required=True)
    parser.add_argument("--sha256", required=True)
    args = parser.parse_args()
    assert os.geteuid() == 0 and re.fullmatch(r"[0-9a-f]{64}", args.sha256)
    assert subprocess.check_output(["hostname"], text=True).strip() == "wicflow-clients-1"
    os.umask(0o077)
    family = Path("/etc/hackathon-demos") / args.family
    assert family.is_dir() and (family / "compose.json").is_file()
    receipt = family / "publisher-installed.json"
    assert not receipt.exists()
    public = sys.stdin.read(2048).strip()
    assert re.fullmatch(r"ssh-ed25519 [A-Za-z0-9+/]+={0,3}( [A-Za-z0-9@._-]+)?", public)
    source = Path(__file__).with_name("publish_server.py").read_bytes()
    assert hashlib.sha256(source).hexdigest() == args.sha256
    folder = Path("/usr/local/lib/wicflow-demo-publisher")
    folder.mkdir(mode=0o700, exist_ok=True)
    assert not folder.is_symlink() and folder.stat().st_uid == 0
    assert folder.stat().st_mode & 0o022 == 0
    installed = folder / "publish_server.py"
    if installed.exists():
        assert not installed.is_symlink() and installed.stat().st_uid == 0
        assert installed.stat().st_mode & 0o022 == 0 and installed.read_bytes() == source
    else:
        installed.write_bytes(source)
        installed.chmod(0o700)
    command = "/usr/bin/python3 -I " + str(installed) + " --family " + args.family
    line = 'restrict,command="' + command + '" ' + public + "\n"
    keys = Path("/root/.ssh/authorized_keys")
    assert keys.is_file() and not keys.is_symlink() and keys.stat().st_uid == 0
    with (keys.parent / ".authorized_keys.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        old = keys.read_bytes()
        assert public.split()[1].encode() not in old
        stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        saved = family / ("authorized_keys-before-publisher-" + stamp)
        with saved.open("xb") as stream:
            stream.write(old)
        saved.chmod(0o600)
        assert keys.read_bytes() == old
        keys.write_bytes(old.rstrip(b"\n") + b"\n" + line.encode())
        keys.chmod(0o600)
        subprocess.run(["sshd", "-t"], check=True, capture_output=True)
    result = {
        "family": args.family,
        "user": "root",
        "public_key": public,
        "receiver_sha256": args.sha256,
        "forced_command": command,
        "general_shell": False,
        "release_requires_final_live_receipt": True,
        "restricted_ssh_test_pending": True,
    }
    receipt.write_text(json.dumps(result, indent=2) + "\n")
    receipt.chmod(0o600)
    print(json.dumps({k: v for k, v in result.items() if k != "public_key"}))


if __name__ == "__main__":
    main()
