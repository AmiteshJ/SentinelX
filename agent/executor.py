import subprocess
import platform

class CommandExecutor:
    def execute(self, action: str, target: str) -> dict:
        """Execute a SOAR command on the host machine."""
        print(f"[Agent Executor] Executing action '{action}' on target '{target}'")
        
        try:
            if action == "block_ip":
                return self._block_ip(target)
            elif action == "unblock_ip":
                return self._unblock_ip(target)
            elif action == "kill_process":
                return self._kill_process(target)
            else:
                return {"success": False, "output": f"Unknown action: {action}"}
        except Exception as e:
            return {"success": False, "output": f"Execution exception: {str(e)}"}

    def _block_ip(self, ip: str) -> dict:
        system = platform.system()
        if system == "Windows":
            rule_in = f"SentinelX_Block_{ip}_In"
            rule_out = f"SentinelX_Block_{ip}_Out"
            cmd_in = f'netsh advfirewall firewall add rule name="{rule_in}" dir=in action=block remoteip={ip}'
            cmd_out = f'netsh advfirewall firewall add rule name="{rule_out}" dir=out action=block remoteip={ip}'
            
            res_in = subprocess.run(cmd_in, shell=True, capture_output=True, text=True)
            res_out = subprocess.run(cmd_out, shell=True, capture_output=True, text=True)
            
            if res_in.returncode == 0 or res_out.returncode == 0:
                out = f"Windows Firewall rules created for {ip}"
                print(f"[Agent Executor] {out}")
                return {"success": True, "output": out}
            else:
                err = res_in.stderr or res_in.stdout or "Command failed (Run as Administrator)"
                print(f"[Agent Executor Error] {err}")
                return {"success": False, "output": err}
                
        elif system == "Linux":
            cmd = f'sudo iptables -A INPUT -s {ip} -j DROP'
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            if result.returncode == 0:
                return {"success": True, "output": f"Blocked {ip} via iptables"}
            return {"success": False, "output": result.stderr or "Requires sudo"}
                
        return {"success": False, "output": f"Unsupported OS: {system}"}

    def _unblock_ip(self, ip: str) -> dict:
        system = platform.system()
        if system == "Windows":
            rule_in = f"SentinelX_Block_{ip}_In"
            rule_out = f"SentinelX_Block_{ip}_Out"
            subprocess.run(f'netsh advfirewall firewall delete rule name="{rule_in}"', shell=True, capture_output=True)
            subprocess.run(f'netsh advfirewall firewall delete rule name="{rule_out}"', shell=True, capture_output=True)
            out = f"Windows Firewall rules removed for {ip}"
            print(f"[Agent Executor] {out}")
            return {"success": True, "output": out}
        elif system == "Linux":
            subprocess.run(f'sudo iptables -D INPUT -s {ip} -j DROP', shell=True, capture_output=True)
            return {"success": True, "output": f"Unblocked {ip} via iptables"}
        return {"success": False, "output": f"Unsupported OS: {system}"}

    def _kill_process(self, target: str) -> dict:
        system = platform.system()
        if system == "Windows":
            if target.isdigit():
                cmd = f'taskkill /F /PID {target}'
            else:
                cmd = f'taskkill /F /IM {target}'
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            if result.returncode == 0:
                out = f"Successfully terminated process: {target}"
                print(f"[Agent Executor] {out}")
                return {"success": True, "output": out}
            else:
                err = result.stderr or result.stdout or f"Failed to kill {target}"
                print(f"[Agent Executor Error] {err}")
                return {"success": False, "output": err}
        else:
            cmd = f'kill -9 {target}' if target.isdigit() else f'pkill -9 {target}'
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            return {"success": result.returncode == 0, "output": result.stdout or result.stderr}
