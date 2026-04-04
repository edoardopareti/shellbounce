from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import json


@dataclass(frozen=True)
class InputStreamConfig:
    host: str
    port: int
    tick_hz: float


@dataclass(frozen=True)
class AppConfig:
    server_ws_url: str
    input_stream: InputStreamConfig


def load_config(config_path: Path) -> AppConfig:

    """
    Load the application configuration from a JSON file.
    """

    with config_path.open("r", encoding="utf-8") as file:
        raw = json.load(file)

    input_stream = raw.get("input_stream", {})

    return AppConfig(
        server_ws_url=str(raw.get("server_ws_url", "ws://127.0.0.1:8080/ws")),
        input_stream=InputStreamConfig(
            host=str(input_stream.get("host", "127.0.0.1")),
            port=int(input_stream.get("port", 8766)),
            tick_hz=float(input_stream.get("tick_hz", 20)),
        ),
    )
