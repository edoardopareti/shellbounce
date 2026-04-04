from __future__ import annotations

import asyncio
import json
from typing import Any

from websockets.client import connect
from websockets.exceptions import ConnectionClosed

from .config_loader import AppConfig
from .message_queues import StateMessageQueue


class StateMessageReceiver:
    def __init__(self, config: AppConfig, state_queue: StateMessageQueue) -> None:
        self._config = config
        self._state_queue = state_queue

    async def run_forever(self) -> None:
        """
        Run the snapshot receiver indefinitely, handling reconnections as needed.
        """
        while True:
            try:
                # Attempt to connect to the game server and receive state messages continuously.
                await self.receive_state_messages_forever()
            except (OSError, ConnectionClosed) as error:
                print(f"[snapshot_receiver] disconnected: {error}")
                await asyncio.sleep(1.0)

    async def send_initial_observe_message(self, websocket) -> None:
        """
        Send an initial message to the server to indicate that this client
        wants to observe game state updates without participating as a player.
        """
        await websocket.send(json.dumps({"type": "observe"}))

    async def receive_state_messages_forever(self) -> None:
        """
        Connect to the game server and receive state messages indefinitely.
        """
        async with connect(self._config.server_ws_url) as websocket:

            # Send an initial message to the server to indicate
            # that this client wants to observe game state updates.
            await self.send_initial_observe_message(websocket)

            # Continuously receive messages from the server,
            # parse them, and push valid state snapshots to the queue.
            async for raw_message in websocket:
                message = _parse_json(raw_message)
                if message is None:
                    continue

                if message.get("type") != "state":
                    continue

                snapshot = message.get("snapshot")
                if not isinstance(snapshot, dict):
                    continue

                await self._state_queue.push(snapshot)


async def run_snapshot_receiver(
        config: AppConfig, state_queue: StateMessageQueue) -> None:
    """
    Run the state message receiver indefinitely, handling reconnections as needed.
    """
    receiver = StateMessageReceiver(config, state_queue)
    await receiver.run_forever()


def _parse_json(payload: str) -> dict[str, Any] | None:
    """
    Parse a JSON string and return a dictionary if successful, or None if parsing fails
    or if the parsed value is not a dictionary.
    """
    try:
        candidate = json.loads(payload)
    except json.JSONDecodeError:
        return None

    if not isinstance(candidate, dict):
        return None

    return candidate
