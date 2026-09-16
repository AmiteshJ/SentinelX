import psutil
from datetime import datetime, timezone
import socket

class NetworkCollector:
    def __init__(self):
        # Cache for process names to avoid looking them up repeatedly
        self._process_cache = {}

    def get_process_name(self, pid: int) -> str:
        if pid is None:
            return "system"
        if pid in self._process_cache:
            return self._process_cache[pid]
        try:
            name = psutil.Process(pid).name()
            self._process_cache[pid] = name
            return name
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            return "unknown"

    def collect(self) -> list[dict]:
        events = []
        try:
            connections = psutil.net_connections(kind='inet')
        except psutil.AccessDenied:
            print("Access denied to network connections. Try running as Administrator/Root.")
            return []

        for conn in connections:
            # We are mainly interested in ESTABLISHED connections to remote endpoints
            if conn.status != 'ESTABLISHED' or not conn.raddr:
                continue

            # Skip localhost to localhost for less noise (optional, but good for demo)
            if conn.laddr.ip in ('127.0.0.1', '::1') and conn.raddr.ip in ('127.0.0.1', '::1'):
                continue

            protocol = 'TCP' if conn.type == socket.SOCK_STREAM else 'UDP'
            
            event = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "source_ip": conn.laddr.ip,
                "destination_ip": conn.raddr.ip,
                "destination_port": conn.raddr.port,
                "protocol": protocol,
                "raw": {
                    "pid": conn.pid,
                    "process_name": self.get_process_name(conn.pid),
                    "local_port": conn.laddr.port,
                    "status": conn.status
                }
            }
            events.append(event)
            
        return events
