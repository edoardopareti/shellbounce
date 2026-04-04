from __future__ import annotations

import asyncio
from pathlib import Path

from src.config_loader import load_config
from src.generate_input_from_snapshots import run_input_generation_loop
from src.message_queues import QueueSettings, StateMessageQueue, TankInputQueue
from src.snapshot_receiver import run_snapshot_receiver
from src.tankinput_sender import run_tankinput_sender


async def run() -> None:

    # Load configuration from a JSON file located in the same directory as this script.
    config_path = Path(__file__).with_name("config.json")
    config = load_config(config_path)

    # Initialize message queues for state snapshots and tank inputs, with settings defined in QueueSettings.
    queue_settings = QueueSettings(state_history_size=64)
    state_queue = StateMessageQueue(max_size=queue_settings.state_history_size)
    input_queue = TankInputQueue()

    # Compose independent components: receiver (read-only), generator (transform-only), sender (write-only).
    await asyncio.gather(
        run_snapshot_receiver(config, state_queue),
        run_input_generation_loop(
            state_queue,
            input_queue,
            context_messages=4,
            tick_hz=config.input_stream.tick_hz,
        ),
        run_tankinput_sender(config, input_queue),
    )


def main() -> None:
    try:
        # Run the main asynchronous function that starts
        # both the snapshot receiver and tank input sender concurrently.
        asyncio.run(run())
    except KeyboardInterrupt:
        print("[main] shutdown requested")


if __name__ == "__main__":
    main()
