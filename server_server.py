# File: server/server.py

import asyncio
import websockets
import socket
import json

PHONE_SERVER_HOST = "0.0.0.0"
PHONE_SERVER_PORT = 8765
GAME_HOST = "127.0.0.1"
GAME_PORT = 12345

connected_phone_clients = set()
game_socket = None

async def handle_phone_client(websocket, path):
    global connected_phone_clients
    connected_phone_clients.add(websocket)
    print(f"Phone client connected: {websocket.remote_address}")
    try:
        async for message in websocket:
            print(f"Received from phone: {message}")
            try:
                command_text = message.strip()
                if command_text:
                    await send_command_to_game(command_text)
                else:
                    print("Received empty command from phone.")
            except json.JSONDecodeError:
                print(f"Invalid JSON received from phone: {message}")
            except Exception as e:
                print(f"Error processing phone message: {e}")
    except websockets.exceptions.ConnectionClosedOK:
        print(f"Phone client disconnected: {websocket.remote_address}")
    except Exception as e:
        print(f"Unexpected error with phone client: {e}")
    finally:
        connected_phone_clients.remove(websocket)

async def connect_to_game_mod():
    global game_socket
    if game_socket and not game_socket._closed:
        return True
    print(f"Attempting to connect to game mod at {GAME_HOST}:{GAME_PORT}...")
    try:
        reader, writer = await asyncio.open_connection(GAME_HOST, GAME_PORT)
        game_socket = writer
        print("Successfully connected to game mod.")
        return True
    except ConnectionRefusedError:
        print(f"Connection refused by game mod at {GAME_HOST}:{GAME_PORT}. Is BG3 running with the mod?")
        return False
    except Exception as e:
        print(f"Error connecting to game mod: {e}")
        game_socket = None
        return False

async def send_command_to_game(command: str):
    if not game_socket:
        print("Not connected to game mod. Attempting to reconnect...")
        if not await connect_to_game_mod():
            print("Failed to send command: Not connected to game mod.")
            return
    try:
        full_command = command + "\n"
        game_socket.write(full_command.encode())
        await game_socket.drain()
        print(f"Sent to game: '{command}'")
    except ConnectionResetError:
        print("Game mod connection lost. Attempting to reconnect...")
        global game_socket
        if game_socket:
            game_socket.close()
        game_socket = None
        if await connect_to_game_mod():
            await send_command_to_game(command)
        else:
            print("Failed to send command after reconnect attempt.")
    except Exception as e:
        print(f"Error sending command to game mod: {e}")
        game_socket = None

async def main():
    phone_server = websockets.serve(handle_phone_client, PHONE_SERVER_HOST, PHONE_SERVER_PORT)
    print(f"PC Server running. Listening for phone connections on ws://{PHONE_SERVER_HOST}:{PHONE_SERVER_PORT}")
    print(f"PC Server will try to connect to game mod on {GAME_HOST}:{GAME_PORT}")
    asyncio.create_task(connect_to_game_mod_periodically())
    await phone_server.serve_forever()

async def connect_to_game_mod_periodically():
    while True:
        if not game_socket or game_socket._closed:
            await connect_to_game_mod()
        await asyncio.sleep(5)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nServer shutting down.")
    except Exception as e:
        print(f"An error occurred in main: {e}")