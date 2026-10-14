import json
import os
import sys
import subprocess
import time
import uuid
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.security import create_agent_token
from app.db.redis_client import get_redis
from app.services.audit_service import log_action

router = APIRouter(prefix="/api/agent", tags=["agent"])

AGENT_PROCESS = None

class CommandRequest(BaseModel):
    action: str
    target: str
    incident_id: str | None = None

class CommandResult(BaseModel):
    command_id: str
    status: str
    output: str | None = None

class AgentPermissions(BaseModel):
    telemetry_enabled: bool = True
    firewall_enabled: bool = True
    kill_process_enabled: bool = True
    ai_remediation_enabled: bool = True

class AgentHeartbeat(BaseModel):
    hostname: Optional[str] = None
    os: Optional[str] = None
    connections_count: Optional[int] = 0

@router.get("/permissions", response_model=AgentPermissions)
async def get_permissions(user=Depends(get_current_user)):
    redis = get_redis()
    raw = await redis.get(f"agent:permissions:{user.id}")
    if raw:
        try:
            return AgentPermissions(**json.loads(raw))
        except Exception:
            pass
    return AgentPermissions()

@router.put("/permissions", response_model=AgentPermissions)
async def update_permissions(
    perms: AgentPermissions,
    background_tasks: BackgroundTasks,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    redis = get_redis()
    perms_json = json.dumps(perms.model_dump())
    await redis.set(f"agent:permissions:{user.id}", perms_json)
    # Also set global agent active policy
    await redis.set("agent:active_policy", perms_json)
    
    await log_action(
        db,
        user_id=user.id,
        action="update_agent_permissions",
        resource_type="agent",
        metadata=perms.model_dump()
    )
    await db.commit()
    return perms

@router.post("/heartbeat")
async def report_heartbeat(hb: AgentHeartbeat, user=Depends(get_current_user)):
    redis = get_redis()
    now = time.time()
    hostname = hb.hostname or "Host-PC"
    payload = {
        "last_seen": now,
        "hostname": hostname,
        "os": hb.os or sys.platform,
        "connections_count": hb.connections_count,
        "user_id": str(user.id),
        "user_email": getattr(user, "email", "")
    }
    await redis.set(f"agent:heartbeat:{user.id}", json.dumps(payload), ex=30)
    await redis.set("agent:heartbeat", json.dumps(payload), ex=30)
    await redis.set(f"agent:fleet:{user.id}:{hostname}", json.dumps(payload), ex=60)
    
    # Return active policy to the agent
    raw_policy = await redis.get(f"agent:permissions:{user.id}") or await redis.get("agent:active_policy")
    policy = json.loads(raw_policy) if raw_policy else AgentPermissions().model_dump()
    return {"status": "ok", "policy": policy}

@router.get("/status")
async def get_agent_status(user=Depends(get_current_user)):
    redis = get_redis()
    raw = await redis.get(f"agent:heartbeat:{user.id}")
    if not raw:
        # Check global fallback
        raw = await redis.get("agent:heartbeat")
    if not raw:
        return {"online": False, "details": None}
    
    data = json.loads(raw)
    is_recent = (time.time() - data.get("last_seen", 0)) < 25
    return {
        "online": is_recent,
        "details": data if is_recent else None
    }

@router.get("/endpoints")
async def list_endpoints(user=Depends(get_current_user)):
    """List all currently active endpoints enrolled in the fleet."""
    redis = get_redis()
    keys = await redis.keys("agent:fleet:*")
    endpoints = []
    for k in keys:
        raw = await redis.get(k)
        if raw:
            try:
                data = json.loads(raw)
                is_recent = (time.time() - data.get("last_seen", 0)) < 60
                data["online"] = is_recent
                data["is_current_user"] = (data.get("user_id") == str(user.id))
                endpoints.append(data)
            except Exception:
                pass
    return {"endpoints": endpoints}

@router.get("/enrollment")
async def get_enrollment(user=Depends(get_current_user)):
    """Generate a passwordless agent enrollment token and copy-paste startup commands."""
    token = create_agent_token(str(user.id), email=user.email)
    return {
        "token": token,
        "email": user.email,
        "user_id": str(user.id),
        "command_windows": f".\\run.bat --token {token}",
        "command_python": f"python main.py --token {token}",
    }

@router.post("/start")
async def start_agent_process(
    background_tasks: BackgroundTasks,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Spawns the local agent background process, auto-configured with the current user's token."""
    global AGENT_PROCESS
    
    # Check if already running for this user
    redis = get_redis()
    raw = await redis.get(f"agent:heartbeat:{user.id}")
    if raw:
        data = json.loads(raw)
        if (time.time() - data.get("last_seen", 0)) < 15:
            return {"status": "already_running", "message": "Agent is already actively connected to your account."}
    
    # Locate agent directory with multiple fallback candidate paths
    candidates = [
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "agent")),
        os.path.abspath(os.path.join(os.getcwd(), "..", "agent")),
        os.path.abspath(os.path.join(os.getcwd(), "agent")),
        os.path.abspath("G:/Projects/Mini Project/4th Year/Major Project/SentinelX/agent"),
    ]
    
    agent_dir = None
    for cand in candidates:
        if os.path.exists(os.path.join(cand, "main.py")):
            agent_dir = cand
            break
            
    if agent_dir:
        agent_script = os.path.join(agent_dir, "main.py")
        agent_token = create_agent_token(str(user.id), email=user.email)

        # Auto-write or update agent/.env with passwordless token
        try:
            env_file = os.path.join(agent_dir, ".env")
            env_lines = []
            if os.path.exists(env_file):
                with open(env_file, "r", encoding="utf-8") as f:
                    for line in f:
                        line_str = line.strip()
                        if not any(line_str.startswith(k) for k in ["SENTINELX_AGENT_TOKEN=", "SENTINELX_USER_EMAIL="]):
                            env_lines.append(line_str)
            else:
                env_lines.append("SENTINELX_API_URL=http://localhost:8000")
                env_lines.append("AGENT_POLL_INTERVAL=5")

            env_lines.append(f"SENTINELX_AGENT_TOKEN={agent_token}")
            env_lines.append(f"SENTINELX_USER_EMAIL={user.email}")
            with open(env_file, "w", encoding="utf-8") as f:
                f.write("\n".join(env_lines) + "\n")
        except Exception as env_err:
            logger.warning("agent_env_write_failed", error=str(env_err))

        try:
            # Spawn agent as detached subprocess with token injected into environment
            spawn_env = os.environ.copy()
            spawn_env["SENTINELX_AGENT_TOKEN"] = agent_token
            spawn_env["SENTINELX_USER_EMAIL"] = user.email

            python_exe = sys.executable or "python"
            if sys.platform == "win32":
                AGENT_PROCESS = subprocess.Popen(
                    [python_exe, agent_script],
                    cwd=agent_dir,
                    env=spawn_env,
                    creationflags=subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS
                )
            else:
                AGENT_PROCESS = subprocess.Popen(
                    [python_exe, agent_script],
                    cwd=agent_dir,
                    env=spawn_env,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
            
            background_tasks.add_task(
                log_action,
                db,
                user_id=user.id,
                action="agent_process_started",
                resource_type="agent",
                metadata={"pid": AGENT_PROCESS.pid, "agent_dir": agent_dir, "user_email": user.email}
            )
            return {"status": "started", "pid": AGENT_PROCESS.pid, "message": "Agent background process started and paired to your account!"}
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Failed to launch agent process: {str(exc)}")

            
    return {"status": "manual_start_required", "message": "Agent script not found on local path; please start agent using agent/run.bat."}

@router.post("/command")
async def queue_command(
    req: CommandRequest,
    background_tasks: BackgroundTasks,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Queue a command for the live agent to execute (e.g. block_ip)."""
    redis = get_redis()
    
    # Check permissions
    raw_perms = await redis.get(f"agent:permissions:{user.id}")
    if raw_perms:
        perms = json.loads(raw_perms)
        if req.action in ("block_ip", "unblock_ip") and not perms.get("firewall_enabled", True):
            raise HTTPException(status_code=403, detail="Firewall containment permission is currently disabled in your TopBar settings.")
        if req.action == "kill_process" and not perms.get("kill_process_enabled", True):
            raise HTTPException(status_code=403, detail="Process termination permission is currently disabled in your TopBar settings.")
            
    command_id = str(uuid.uuid4())
    command = {
        "id": command_id,
        "action": req.action,
        "target": req.target,
        "incident_id": req.incident_id,
        "requested_by": str(user.id)
    }
    
    await redis.lpush(f"agent:commands:{user.id}", json.dumps(command))
    await redis.lpush("agent:commands", json.dumps(command))
    
    await log_action(
        db,
        user_id=user.id,
        action=f"agent_command_{req.action}",
        resource_type="agent",
        metadata={"target": req.target, "command_id": command_id, "incident_id": req.incident_id}
    )
    await db.commit()
    
    return {"status": "queued", "command_id": command_id}

@router.get("/commands")
async def get_commands(user=Depends(get_current_user)):
    """Agent polls this to get pending commands."""
    redis = get_redis()
    commands = []
    
    while True:
        cmd_json = await redis.rpop(f"agent:commands:{user.id}")
        if not cmd_json:
            cmd_json = await redis.rpop("agent:commands")
        if not cmd_json:
            break
        commands.append(json.loads(cmd_json))
        
    return {"commands": commands}

@router.post("/command-result")
async def report_command_result(
    res: CommandResult,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Agent reports success/failure of a command."""
    await log_action(
        db,
        user_id=user.id,
        action=f"agent_command_result_{res.status}",
        resource_type="agent",
        metadata={"command_id": res.command_id, "output": res.output}
    )
    await db.commit()
    return {"status": "recorded"}
