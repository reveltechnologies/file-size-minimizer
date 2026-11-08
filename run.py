#!/usr/bin/env python3
"""Launch the File Size Minimizer dev server in a standalone desktop window.

When this script is run:
1. Installs npm dependencies in `src/` if needed.
2. Starts the Vite dev server on an available local port.
3. Opens the app in a standalone desktop window (Chrome/Edge `--app` mode).
4. Automatically shuts down the dev server and cleans up when the window is closed.
"""

from __future__ import annotations

import os
import shutil
import signal
import socket
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.request
import webbrowser
from collections import deque
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
SRC_DIR = ROOT_DIR / "src"


def find_npm() -> str:
    """Return the npm executable path for the current platform."""
    candidates = ["npm.cmd", "npm"] if sys.platform == "win32" else ["npm"]
    for candidate in candidates:
        path = shutil.which(candidate)
        if path:
            return path
    raise RuntimeError("Could not find 'npm' in PATH. Please install Node.js 22+.")


def find_free_port() -> int:
    """Find an available localhost TCP port."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def wait_for_server(url: str, server_proc: subprocess.Popen, timeout: float = 30.0) -> bool:
    """Poll `url` until the dev server responds or times out."""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if server_proc.poll() is not None:
            return False
        try:
            with urllib.request.urlopen(url, timeout=1.0) as resp:
                if resp.status < 500:
                    return True
        except (urllib.error.URLError, ConnectionError, OSError):
            time.sleep(0.2)
    return False


def find_app_browser() -> str | None:
    """Locate a Chromium-based browser that supports standalone `--app` windows."""
    if sys.platform == "win32":
        local_app_data = os.environ.get("LOCALAPPDATA", "")
        program_files = os.environ.get("PROGRAMFILES", r"C:\Program Files")
        program_files_x86 = os.environ.get("PROGRAMFILES(X86)", r"C:\Program Files (x86)")
        candidates = [
            Path(program_files) / "Google/Chrome/Application/chrome.exe",
            Path(program_files_x86) / "Google/Chrome/Application/chrome.exe",
            Path(local_app_data) / "Google/Chrome/Application/chrome.exe",
            Path(program_files_x86) / "Microsoft/Edge/Application/msedge.exe",
            Path(program_files) / "Microsoft/Edge/Application/msedge.exe",
            Path(local_app_data) / "Microsoft/Edge/Application/msedge.exe",
        ]
        for path in candidates:
            if path.is_file():
                return str(path)
    elif sys.platform == "darwin":
        candidates = [
            Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
            Path("/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"),
            Path("/Applications/Chromium.app/Contents/MacOS/Chromium"),
        ]
        for path in candidates:
            if path.is_file():
                return str(path)
    else:
        for binary in ("google-chrome", "chromium", "chromium-browser", "microsoft-edge"):
            found = shutil.which(binary)
            if found:
                return found
    return None


def kill_process_tree(proc: subprocess.Popen | None) -> None:
    """Terminate a subprocess and all of its child processes."""
    if proc is None or proc.poll() is not None:
        return
    try:
        if sys.platform == "win32":
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False,
            )
        else:
            os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
            try:
                proc.wait(timeout=3)
            except subprocess.TimeoutExpired:
                os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
    except OSError:
        pass


def ensure_dependencies(npm_bin: str) -> None:
    """Run `npm install` in `src/` if dependencies or workspace links are missing."""
    core_link = SRC_DIR / "node_modules" / "@revel" / "core"
    if not (SRC_DIR / "node_modules").is_dir() or not core_link.exists():
        print("==> Installing npm dependencies in src/...")
        subprocess.run([npm_bin, "install"], cwd=str(SRC_DIR), check=True)


def main() -> int:
    if not (SRC_DIR / "package.json").is_file():
        print(f"Error: Could not find package.json in {SRC_DIR}", file=sys.stderr)
        return 1

    npm_bin = find_npm()
    ensure_dependencies(npm_bin)

    port = find_free_port()
    url = f"http://127.0.0.1:{port}"

    popen_kwargs: dict = {
        "cwd": str(SRC_DIR),
        "stdout": subprocess.PIPE,
        "stderr": subprocess.STDOUT,
        "text": True,
    }
    if sys.platform == "win32":
        popen_kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
    else:
        popen_kwargs["start_new_session"] = True

    server_cmd = [
        npm_bin,
        "run",
        "dev",
        "-w",
        "apps/web",
        "--",
        "--host",
        "127.0.0.1",
        "--port",
        str(port),
        "--strictPort",
    ]

    print(f"==> Starting dev server at {url} ...")
    server_proc = subprocess.Popen(server_cmd, **popen_kwargs)
    recent_logs: deque[str] = deque(maxlen=50)

    def _drain_logs() -> None:
        if server_proc.stdout is None:
            return
        for line in server_proc.stdout:
            recent_logs.append(line)

    threading.Thread(target=_drain_logs, daemon=True).start()
    window_proc: subprocess.Popen | None = None
    temp_profile_dir: str | None = None

    def cleanup(*_args: object) -> None:
        print("\n==> Shutting down application and dev server...")
        kill_process_tree(window_proc)
        kill_process_tree(server_proc)
        if temp_profile_dir and os.path.isdir(temp_profile_dir):
            shutil.rmtree(temp_profile_dir, ignore_errors=True)

    signal.signal(signal.SIGINT, lambda *_: sys.exit(0))
    signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))
    if hasattr(signal, "SIGBREAK"):
        signal.signal(signal.SIGBREAK, lambda *_: sys.exit(0))

    try:
        if not wait_for_server(url, server_proc):
            print("Error: Dev server failed to start.", file=sys.stderr)
            if recent_logs:
                print("".join(recent_logs), file=sys.stderr)
            return 1

        browser_bin = find_app_browser()
        if browser_bin:
            temp_profile_dir = tempfile.mkdtemp(prefix="fsm-app-window-")
            window_cmd = [
                browser_bin,
                f"--app={url}",
                f"--user-data-dir={temp_profile_dir}",
                "--window-size=412,880",
                "--no-first-run",
                "--no-default-browser-check",
                "--disable-background-mode",
                "--disable-extensions",
            ]
            print("==> Opening standalone application window (close the window to stop everything)...")
            window_proc = subprocess.Popen(
                window_cmd,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )

            # Wait until either the user closes the standalone window or the server stops.
            while window_proc.poll() is None and server_proc.poll() is None:
                time.sleep(0.3)
        else:
            print("==> Opening in default browser (press Ctrl+C here to stop the server)...")
            webbrowser.open_new(url)
            server_proc.wait()

        return 0
    finally:
        cleanup()


if __name__ == "__main__":
    sys.exit(main())
