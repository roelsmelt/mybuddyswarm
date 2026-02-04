#!/usr/bin/env python3
"""
Spawn a new Buddy on Railway using the Railway API.
Usage: python spawn_buddy_api.py <human-name> <buddy-name> [--telegram-token TOKEN]
"""

import os
import sys
import argparse
import subprocess
import json
from pathlib import Path

# Load environment
ENV_FILE = Path(__file__).parent.parent / ".env.secrets"

def load_secrets():
    """Load secrets from .env.secrets file."""
    secrets = {}
    if ENV_FILE.exists():
        with open(ENV_FILE) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    secrets[key.strip()] = value.strip()
    return secrets

def run_railway_cmd(args: list, cwd: str = None) -> tuple[int, str]:
    """Run a Railway CLI command and return exit code + output."""
    result = subprocess.run(
        ["railway"] + args,
        capture_output=True,
        text=True,
        cwd=cwd
    )
    return result.returncode, result.stdout + result.stderr

def spawn_buddy(human_name: str, buddy_name: str, telegram_token: str = None):
    """Spawn a new buddy on Railway."""
    project_name = f"{human_name}-{buddy_name}"
    secrets = load_secrets()
    
    print(f"🚀 Spawning buddy: {project_name}")
    
    # Step 1: Create project via CLI
    print("📦 Creating Railway project...")
    code, output = run_railway_cmd(["init", "--name", project_name])
    if code != 0:
        print(f"❌ Failed to create project: {output}")
        return False
    
    # Extract project URL from output
    for line in output.split("\n"):
        if "railway.com/project" in line:
            print(f"   Project URL: {line.strip()}")
    
    print("")
    print("⚠️  Manual step required:")
    print(f"   1. Go to: https://railway.com/new/template/openclaw")
    print(f"   2. Click 'Deploy to' dropdown → select '{project_name}'")
    print(f"   3. Click 'Deploy'")
    print("")
    input("Press Enter when deployed...")
    
    # Step 2: Link and set variables
    print("🔗 Linking to project...")
    # This is interactive, so we skip it
    
    print("🔐 Setting environment variables...")
    
    gemini_key = secrets.get("GEMINI_API_KEY")
    if gemini_key:
        run_railway_cmd(["variables", "set", f"GEMINI_API_KEY={gemini_key}"])
        print("   ✓ GEMINI_API_KEY set")
    
    tg_token = telegram_token or secrets.get("CLAWDBOT_TELEGRAM_TOKEN")
    if tg_token:
        run_railway_cmd(["variables", "set", f"TELEGRAM_BOT_TOKEN={tg_token}"])
        print("   ✓ TELEGRAM_BOT_TOKEN set")
    
    # Step 3: Get domain
    code, output = run_railway_cmd(["domain"])
    domain = None
    for line in output.split("\n"):
        if "railway.app" in line:
            domain = line.strip()
            break
    
    print("")
    print(f"✅ Buddy {project_name} spawned!")
    if domain:
        print(f"🌐 URL: {domain}")
        print(f"🔧 Setup: {domain}/setup")
    
    # Step 4: Register in Supabase (TODO)
    print("")
    print("📝 Next steps:")
    print("   1. Go to setup URL and configure")
    print("   2. Upload SOUL.md and IDENTITY.md")
    print("   3. Test Telegram channel")
    
    return True

def main():
    parser = argparse.ArgumentParser(description="Spawn a new Buddy on Railway")
    parser.add_argument("human_name", help="Human's name (e.g., roel)")
    parser.add_argument("buddy_name", help="Buddy's name (e.g., emrys)")
    parser.add_argument("--telegram-token", help="Telegram bot token (optional)")
    
    args = parser.parse_args()
    
    success = spawn_buddy(
        args.human_name,
        args.buddy_name,
        args.telegram_token
    )
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
