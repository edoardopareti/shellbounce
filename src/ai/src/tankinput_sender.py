from __future__ import annotations

import asyncio
import json

from websockets.asyncio.server import serve

from .config_loader import AppConfig
from .message_queues import TankInputQueue


class TankInputSender:
    def __init__(
            self, config: AppConfig, input_queue: TankInputQueue) -> None:
        self._config = config
        self._input_queue = input_queue

    async def run_forever(self) -> None:
        """
        Run the tank input sender indefinitely, handling client connections as needed.
        """
        host = self._config.input_stream.host
        port = self._config.input_stream.port

        async with serve(self._stream_handler, host, port):
            print(f"[tankinput_sender] listening on ws://{host}:{port}")
            await asyncio.Future()

    async def send_tank_input_messages_forever(
            self, websocket) -> None:
        """
        Handle a new client connection to the tank input sender stream.
        This method continuously sends the latest tank input messages to the connected client
        at a fixed tick rate until the connection is closed.
        """
        tick_hz = max(1.0, float(self._config.input_stream.tick_hz))
        tick_interval_s = 1.0 / tick_hz

        while True:
            latest_input = await self._input_queue.get_latest()
            if latest_input is not None:
                await websocket.send(json.dumps(latest_input))

            await asyncio.sleep(tick_interval_s)

    async def _stream_handler(self, websocket) -> None:
        """
        Handle a new client connection to the tank input sender stream.
        This method continuously sends the latest tank input messages to the connected client
        at a fixed tick rate until the connection is closed.
        """
        try:
            await self.send_tank_input_messages_forever(websocket)
        except Exception as error:
            print(f"[tankinput_sender] client stream closed: {error}")


async def run_tankinput_sender(
        config: AppConfig, input_queue: TankInputQueue) -> None:
    """
    Run the tank input sender indefinitely, handling client connections as needed.
    """
    sender = TankInputSender(config, input_queue)
    await sender.run_forever()
