from __future__ import annotations

from collections import deque
from dataclasses import dataclass
import asyncio
from typing import Any

StateMessage = dict[str, Any]
TankInputMessage = dict[str, bool | float]


@dataclass(frozen=True)
class QueueSettings:
    state_history_size: int = 64


class StateMessageQueue:
    def __init__(self, max_size: int) -> None:
        self._messages: deque[StateMessage] = deque(maxlen=max(1, max_size))
        self._lock = asyncio.Lock()

    async def push(self, state_message: StateMessage) -> None:
        async with self._lock:
            self._messages.append(state_message)

    async def get_last(self, count: int) -> list[StateMessage]:
        safe_count = max(0, count)
        async with self._lock:
            if safe_count == 0:
                return []
            return list(self._messages)[-safe_count:]


class TankInputQueue:
    def __init__(self) -> None:
        self._latest_input: TankInputMessage | None = None
        self._lock = asyncio.Lock()

    async def set_latest(self, tank_input: TankInputMessage) -> None:
        async with self._lock:
            self._latest_input = tank_input

    async def get_latest(self) -> TankInputMessage | None:
        async with self._lock:
            return self._latest_input
