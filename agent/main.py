import os
import sys
import socket
import platform
import asyncio
import traceback
from dotenv import load_dotenv

from collectors.network import NetworkCollector
from transport.client import SentinelXClient
from executor import CommandExecutor

async def main():
    load_dotenv()
    
    api_url = os.getenv("SENTINELX_API_URL", "http://localhost:8000")
    poll_interval = int(os.getenv("AGENT_POLL_INTERVAL", "5"))
    hostname = socket.gethostname()
    os_name = f"{platform.system()} {platform.release()}"
    
    print(f"Starting SentinelX Agent (Target: {api_url})")
    print(f"Host: {hostname} ({os_name}) | Poll interval: {poll_interval}s")
    
    client = SentinelXClient(api_url)
    network_collector = NetworkCollector()
    
    try:
        await client.auth.get_token()
        print("Successfully authenticated with SentinelX backend.")
    except Exception as e:
        print(f"Failed to authenticate on startup: {e}")
        return

    print("Agent running... Press Ctrl+C to stop.")
    
    executor = CommandExecutor()
    active_policy = {
        "telemetry_enabled": True,
        "firewall_enabled": True,
        "kill_process_enabled": True,
        "ai_remediation_enabled": True
    }
    
    async def poll_commands_loop():
        while True:
            try:
                commands = await client.poll_commands()
                for cmd in commands:
                    action = cmd['action']
                    target = cmd['target']
                    print(f"\n[SOAR Dispatch] Action: {action} | Target: {target}")
                    
                    # Policy enforcement check
                    if action in ("block_ip", "unblock_ip") and not active_policy.get("firewall_enabled", True):
                        out = "Action rejected: Firewall containment is disabled in user permissions."
                        print(f"[Policy Violation] {out}")
                        await client.send_command_result(cmd['id'], "error", out)
                        continue
                    if action == "kill_process" and not active_policy.get("kill_process_enabled", True):
                        out = "Action rejected: Process termination is disabled in user permissions."
                        print(f"[Policy Violation] {out}")
                        await client.send_command_result(cmd['id'], "error", out)
                        continue
                        
                    result = executor.execute(action, target)
                    status = "success" if result["success"] else "error"
                    await client.send_command_result(cmd['id'], status, result["output"])
            except Exception as e:
                print(f"Error polling commands: {e}")
            await asyncio.sleep(3)
            
    asyncio.create_task(poll_commands_loop())
    
    cycle_count = 0
    while True:
        try:
            events = network_collector.collect()
            
            # Send heartbeat & update active permissions from backend
            updated_policy = await client.send_heartbeat(hostname, os_name, len(events))
            if updated_policy:
                active_policy.update(updated_policy)
                
            # If user disabled telemetry, pause sending
            if not active_policy.get("telemetry_enabled", True):
                if cycle_count % 3 == 0:
                    print("[Policy Notice] Host telemetry streaming is currently PAUSED by user permissions.")
            else:
                if events:
                    for i in range(0, len(events), 200):
                        batch = events[i:i+200]
                        await client.send_events(batch)
                    
                    cycle_count += 1
                    if cycle_count % 3 == 0:
                        print(f"[Telemetry Ingestion] Streamed {len(events)} live host connections to SentinelX.")
        except Exception as e:
            print(f"Error during collection/send loop: {e}")
            traceback.print_exc()
            
        await asyncio.sleep(poll_interval)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Agent stopped by user.")
