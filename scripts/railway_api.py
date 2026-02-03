#!/usr/bin/env python3
"""
Railway GraphQL API client for spawning OpenClaw buddies.
Fully automated - no manual steps required.
"""

import os
import json
import requests
from pathlib import Path
from typing import Optional

RAILWAY_API_URL = "https://backboard.railway.com/graphql/v2"
OPENCLAW_REPO = "arjunkomath/openclaw-railway-template"

class RailwayAPI:
    def __init__(self, token: str):
        self.token = token
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    def _query(self, query: str, variables: dict = None) -> dict:
        """Execute GraphQL query."""
        payload = {"query": query}
        if variables:
            payload["variables"] = variables
        
        response = requests.post(
            RAILWAY_API_URL,
            headers=self.headers,
            json=payload
        )
        response.raise_for_status()
        result = response.json()
        
        if "errors" in result:
            print(f"GraphQL error: {result['errors']}")
            return {}
        
        return result.get("data", {})
    
    def list_projects(self) -> list:
        """List all projects."""
        query = """
        query {
            projects {
                edges {
                    node {
                        id
                        name
                    }
                }
            }
        }
        """
        result = self._query(query)
        edges = result.get("projects", {}).get("edges", [])
        return [edge["node"] for edge in edges]
    
    def get_project_services(self, project_id: str) -> list:
        """Get services for a project."""
        query = """
        query project($id: String!) {
            project(id: $id) {
                services {
                    edges {
                        node {
                            id
                            name
                        }
                    }
                }
            }
        }
        """
        result = self._query(query, {"id": project_id})
        edges = result.get("project", {}).get("services", {}).get("edges", [])
        return [edge["node"] for edge in edges]
    
    def get_me(self) -> dict:
        """Get current user info."""
        query = """
        query {
            me {
                id
                email
                name
            }
        }
        """
        return self._query(query).get("me", {})
    
    def create_project(self, name: str) -> dict:
        """Create a new Railway project."""
        query = """
        mutation projectCreate($input: ProjectCreateInput!) {
            projectCreate(input: $input) {
                id
                name
            }
        }
        """
        variables = {
            "input": {
                "name": name
            }
        }
        return self._query(query, variables).get("projectCreate", {})
    
    def create_service_from_repo(self, project_id: str, repo: str, name: str = "OpenClaw") -> dict:
        """Create a service from a GitHub repo."""
        query = """
        mutation serviceCreate($input: ServiceCreateInput!) {
            serviceCreate(input: $input) {
                id
                name
            }
        }
        """
        variables = {
            "input": {
                "projectId": project_id,
                "name": name,
                "source": {
                    "repo": repo
                }
            }
        }
        return self._query(query, variables).get("serviceCreate", {})
    
    def create_volume(self, project_id: str, environment_id: str, mount_path: str = "/data") -> dict:
        """Create a persistent volume."""
        query = """
        mutation volumeCreate($input: VolumeCreateInput!) {
            volumeCreate(input: $input) {
                id
                name
            }
        }
        """
        variables = {
            "input": {
                "projectId": project_id,
                "environmentId": environment_id,
                "mountPath": mount_path
            }
        }
        return self._query(query, variables).get("volumeCreate", {})
    
    def set_variables(self, project_id: str, environment_id: str, service_id: str, variables: dict) -> bool:
        """Set environment variables for a service."""
        query = """
        mutation variableCollectionUpsert($input: VariableCollectionUpsertInput!) {
            variableCollectionUpsert(input: $input)
        }
        """
        input_vars = {
            "input": {
                "projectId": project_id,
                "environmentId": environment_id,
                "serviceId": service_id,
                "variables": variables
            }
        }
        self._query(query, input_vars)
        return True
    
    def get_project_environments(self, project_id: str) -> list:
        """Get environments for a project."""
        query = """
        query project($id: String!) {
            project(id: $id) {
                environments {
                    edges {
                        node {
                            id
                            name
                        }
                    }
                }
            }
        }
        """
        result = self._query(query, {"id": project_id})
        edges = result.get("project", {}).get("environments", {}).get("edges", [])
        return [edge["node"] for edge in edges]
    
    def create_domain(self, environment_id: str, service_id: str) -> dict:
        """Create a public domain for a service."""
        query = """
        mutation serviceDomainCreate($input: ServiceDomainCreateInput!) {
            serviceDomainCreate(input: $input) {
                id
                domain
            }
        }
        """
        variables = {
            "input": {
                "environmentId": environment_id,
                "serviceId": service_id
            }
        }
        return self._query(query, variables).get("serviceDomainCreate", {})
    
    def deploy_service(self, service_id: str, environment_id: str) -> dict:
        """Trigger a deployment."""
        query = """
        mutation serviceInstanceDeploy($serviceId: String!, $environmentId: String!) {
            serviceInstanceDeploy(serviceId: $serviceId, environmentId: $environmentId)
        }
        """
        return self._query(query, {
            "serviceId": service_id,
            "environmentId": environment_id
        })


def spawn_buddy(
    api: RailwayAPI,
    human_name: str,
    buddy_name: str,
    gemini_api_key: str,
    telegram_token: Optional[str] = None
) -> dict:
    """
    Spawn a new buddy on Railway.
    Returns dict with project info and URLs.
    """
    project_name = f"{human_name}-{buddy_name}"
    
    print(f"🚀 Spawning buddy: {project_name}")
    
    # 1. Create project
    print("📦 Creating project...")
    project = api.create_project(project_name)
    project_id = project["id"]
    print(f"   ✓ Project created: {project_id}")
    
    # 2. Get production environment
    print("🌍 Getting environment...")
    environments = api.get_project_environments(project_id)
    prod_env = next((e for e in environments if e["name"] == "production"), environments[0])
    environment_id = prod_env["id"]
    print(f"   ✓ Environment: {prod_env['name']}")
    
    # 3. Create service from OpenClaw repo
    print("🔗 Creating OpenClaw service...")
    service = api.create_service_from_repo(project_id, OPENCLAW_REPO, "OpenClaw")
    service_id = service["id"]
    print(f"   ✓ Service created: {service_id}")
    
    # 4. Create volume
    print("💾 Creating volume...")
    volume = api.create_volume(project_id, environment_id, "/data")
    print(f"   ✓ Volume created: {volume.get('id', 'OK')}")
    
    # 5. Set environment variables
    print("🔐 Setting environment variables...")
    env_vars = {
        "GEMINI_API_KEY": gemini_api_key,
        "OPENCLAW_STATE_DIR": "/data/.openclaw",
        "OPENCLAW_WORKSPACE_DIR": "/data/workspace",
        "INTERNAL_GATEWAY_HOST": "127.0.0.1",
        "INTERNAL_GATEWAY_PORT": "18789"
    }
    if telegram_token:
        env_vars["TELEGRAM_BOT_TOKEN"] = telegram_token
    
    api.set_variables(project_id, environment_id, service_id, env_vars)
    print("   ✓ Variables set")
    
    # 6. Create public domain
    print("🌐 Creating domain...")
    domain_info = api.create_domain(environment_id, service_id)
    domain = domain_info.get("domain", "pending...")
    print(f"   ✓ Domain: {domain}")
    
    # 7. Trigger deployment
    print("🚢 Deploying...")
    api.deploy_service(service_id, environment_id)
    print("   ✓ Deployment triggered")
    
    result = {
        "project_id": project_id,
        "project_name": project_name,
        "service_id": service_id,
        "environment_id": environment_id,
        "domain": domain,
        "setup_url": f"https://{domain}/setup" if domain else None
    }
    
    print("")
    print(f"✅ Buddy {project_name} spawned!")
    print(f"🌐 URL: https://{domain}")
    print(f"🔧 Setup: https://{domain}/setup")
    
    return result


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Spawn a new Buddy on Railway (fully automated)")
    parser.add_argument("human_name", help="Human's name (e.g., roel)")
    parser.add_argument("buddy_name", help="Buddy's name (e.g., emrys)")
    parser.add_argument("--telegram-token", help="Telegram bot token")
    parser.add_argument("--railway-token", help="Railway API token (or set RAILWAY_API_TOKEN env var)")
    parser.add_argument("--gemini-key", help="Gemini API key (or set GEMINI_API_KEY env var)")
    
    args = parser.parse_args()
    
    # Load from env or args
    railway_token = args.railway_token or os.environ.get("RAILWAY_API_TOKEN")
    gemini_key = args.gemini_key or os.environ.get("GEMINI_API_KEY")
    
    if not railway_token:
        # Try loading from .env.secrets
        env_file = Path(__file__).parent.parent / ".env.secrets"
        if env_file.exists():
            with open(env_file) as f:
                for line in f:
                    if line.startswith("RAILWAY_API_TOKEN="):
                        railway_token = line.split("=", 1)[1].strip()
                    if line.startswith("GEMINI_API_KEY="):
                        gemini_key = line.split("=", 1)[1].strip()
    
    if not railway_token:
        print("❌ Railway API token required. Set RAILWAY_API_TOKEN or use --railway-token")
        print("   Get one at: https://railway.com/account/tokens")
        return 1
    
    if not gemini_key:
        print("❌ Gemini API key required. Set GEMINI_API_KEY or use --gemini-key")
        return 1
    
    api = RailwayAPI(railway_token)
    
    # Verify connection
    me = api.get_me()
    print(f"👤 Logged in as: {me.get('name', me.get('email', 'Unknown'))}")
    print("")
    
    result = spawn_buddy(
        api,
        args.human_name,
        args.buddy_name,
        gemini_key,
        args.telegram_token
    )
    
    return 0


if __name__ == "__main__":
    exit(main())
