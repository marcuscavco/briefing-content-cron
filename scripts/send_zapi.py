#!/usr/bin/env python3
"""Envia mensagem via Z-API. Lê credenciais de env vars ou argv."""
import os
import sys
import json
import urllib.request
import urllib.error


DEFAULT_INSTANCE = "3F272FF03BFA2384B54026F49989160C"
DEFAULT_TOKEN = "CDD22DA467E7E692E770349D"


def send(phone: str, message: str) -> dict:
    instance = os.environ.get("ZAPI_INSTANCE_ID", DEFAULT_INSTANCE)
    token = os.environ.get("ZAPI_TOKEN", DEFAULT_TOKEN)
    client_token = os.environ.get("ZAPI_CLIENT_TOKEN", "")

    url = f"https://api.z-api.io/instances/{instance}/token/{token}/send-text"
    data = json.dumps({"phone": phone, "message": message}).encode("utf-8")

    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    if client_token:
        req.add_header("Client-Token", client_token)

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        return {"error": True, "status": e.code, "body": body}


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Uso: send_zapi.py <phone> <message>")
        sys.exit(1)
    result = send(sys.argv[1], sys.argv[2])
    print(json.dumps(result, indent=2, ensure_ascii=False))
    if isinstance(result, dict) and result.get("error"):
        sys.exit(1)
