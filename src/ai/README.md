
# Shellbounce AI Bridge

## Introduction

The Shellbounce AI Bridge is a Python module that enables AI agents to interact with the Shellbounce multiplayer tank game.
It acts as a bridge between the game server and the browser client, allowing AI logic to observe game state and control a tank by sending input commands. The bridge is fully decoupled, making it easy to develop and test AI logic independently of networking and I/O concerns.

## Prerequisites

- Python 3.11 or newer
- [pip](https://pip.pypa.io/en/stable/)
- (Recommended) A virtual environment tool such as `venv` or `virtualenv`
- The Shellbounce game server running locally or remotely

Install Python dependencies:

```bash
pip install -e .
```

## Quickstart

1. Ensure the Shellbounce server is running (see the main project README for instructions), with PLAYER_INPUT_SOURCE in src/shared/config.ts set to 'ai'.
2. (Optional) Create and activate a Python virtual environment:
	```bash
	python3 -m venv .venv
	source .venv/bin/activate
	```
3. Install dependencies:
	```bash
	pip install -e .
	```
4. Start the AI bridge:
	```bash
	python main.py
	```
5. Start the Shellbounce client (see the main project README for instructions)

By default, the AI bridge exposes a local WebSocket input stream at `ws://127.0.0.1:8766` for the browser client, and connects to the game server at `ws://127.0.0.1:8080/ws`.

## Architecture Description

The AI bridge is organized as a decoupled, asynchronous pipeline with three main components:

1. **StateMessageReceiver** (`snapshot_receiver.py`):
	- Connects to the Shellbounce server as an observer (does not spawn a tank).
	- Receives `WorldSnapshot` state messages and pushes them to a shared queue.

2. **Input Generator** (`generate_input_from_snapshots.py`):
	- Reads recent state snapshots from the queue.
	- Runs AI logic to generate `TankInput` messages.
	- Pushes generated input to a separate queue.

3. **TankInputSender** (`tankinput_sender.py`):
	- Exposes a WebSocket server for the browser client.
	- Streams the latest `TankInput` messages from the input queue at a fixed tick rate.

All communication between components is handled via asyncio-based queues, ensuring each part can be developed and tested independently.

## Project Structure

```
src/ai/
├── main.py                  # Entry point: wires up the pipeline
├── config.json              # Configuration (server/client URLs, tick rate, etc.)
├── pyproject.toml           # Python project metadata and dependencies
├── src/
│   ├── config_loader.py         # Loads config.json into dataclasses
│   ├── message_queues.py        # Asyncio-based message queue abstractions
│   ├── snapshot_receiver.py     # StateMessageReceiver class (receives game state)
│   ├── generate_input_from_snapshots.py  # AI logic: generates TankInput from snapshots
│   └── tankinput_sender.py      # TankInputSender class (streams input to client)
├── models/                  # (Reserved for future AI/ML models)
├── schemas/                 # (Reserved for message/data schemas)
├── scripts/                 # (Reserved for utility scripts or standalone tests)
└── docs/                    # (Reserved for documentation)
```

**Typical development workflow:**
- Implement or modify AI logic in `src/generate_input_from_snapshots.py`.
- Run `python main.py` to test the end-to-end pipeline.
- Use the browser client with input source set to the AI bridge WebSocket.
