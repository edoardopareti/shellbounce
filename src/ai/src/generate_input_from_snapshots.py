from __future__ import annotations

import asyncio
import json

from .message_queues import StateMessageQueue, TankInputMessage, TankInputQueue


async def run_input_generation_loop(
    state_queue: StateMessageQueue,
    input_queue: TankInputQueue,
    *,
    context_messages: int = 4,
    tick_hz: float = 20,
) -> None:

    """
    Run the input generation loop that continuously reads recent state snapshots
    from the state queue, generates tank input messages based on those snapshots,
    and pushes the latest input messages to the input queue at a fixed tick rate.
    """

    safe_tick_hz = max(1.0, float(tick_hz))
    tick_interval_s = 1.0 / safe_tick_hz
    tick = 0

    # Continuously generate tank input messages based on recent state snapshots
    # and push them to the input queue at a fixed tick rate.
    while True:

        # Retrieve the most recent state snapshots from the state queue,
        # up to the specified context message count.
        recent_messages = await state_queue.get_last(context_messages)

        # For demonstration purposes, we print the latest snapshot to the console.
        if recent_messages:
            last_snapshot = recent_messages[-1]
            print("[input_generator] latest snapshot:", json.dumps(last_snapshot, separators=(",", ":")))

        # Here is where you would implement your AI logic to generate tank input messages
        # based on the recent state snapshots.
        # For this example, we will generate dummy tank input messages
        # that follow a simple pattern.
        tank_input = build_dummy_tank_input(tick)

        # Push the generated tank input message to the input queue
        # so that it can be sent to the game server.
        await input_queue.set_latest(tank_input)

        tick += 1
        await asyncio.sleep(tick_interval_s)


def build_dummy_tank_input(tick: int) -> TankInputMessage:

    """
    Build a dummy tank input message based on the current tick count.
    This function generates a simple pattern of inputs that change over time.
    """

    phase = tick % 160

    move_forward = phase < 120
    turn_left = 40 <= phase < 60
    turn_right = 120 <= phase < 140

    return {
        "moveForward": move_forward,
        "moveBackward": False,
        "turnLeft": turn_left,
        "turnRight": turn_right,
        "shieldHeld": False,
        "firePressed": False,
        "fireHeld": False,
        "fireReleased": False,
        "detonatePressed": False,
        "placeMinePressed": False,
        "boostPressed": phase == 0,
        "pointerWorldX": 960.0,
        "pointerWorldY": 540.0,
    }
