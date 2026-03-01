#!/usr/bin/env python3
"""
Tonalli Smart Monitor — Auto-Recovery + AI Escalation
1. Tries auto-recovery (restart, reload)
2. Only calls Claude API if auto-recovery fails
3. Notifies via Telegram at every step
"""

import http.server
import json
import subprocess
import os
import time
import urllib.request
import ssl

# Config
ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY', '')
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')
TELEGRAM_CHAT_ID = os.environ.get('TELEGRAM_CHAT_ID', '')
PORT = 3002
MAX_RETRIES = 2
RETRY_WAIT = 30  # seconds between retries

# Service -> container mapping
SERVICE_CONTAINERS = {
    'API Health': 'tonalli-api',
    'API (External)': 'tonalli-api',
    'Landing Page': 'tonalli-nginx',
    'Dashboard (app)': 'tonalli-nginx',
    'Menu Digital': 'tonalli-nginx',
    'PostgreSQL': 'tonalli-postgres',
    'Redis': 'tonalli-redis',
    'Nginx': 'tonalli-nginx',
    'Menu API Endpoint': 'tonalli-api',
}

# Recovery strategies per container (ordered by aggressiveness)
RECOVERY_STRATEGIES = {
    'tonalli-api': [
        ('restart', 'docker restart tonalli-api'),
        ('recreate', 'cd /opt/tonalli && docker compose up -d api'),
    ],
    'tonalli-nginx': [
        ('reload', 'docker exec tonalli-nginx nginx -s reload'),
        ('restart', 'docker restart tonalli-nginx'),
    ],
    'tonalli-redis': [
        ('restart', 'docker restart tonalli-redis'),
    ],
    'tonalli-postgres': [
        ('restart', 'docker restart tonalli-postgres'),
    ],
}

# Health checks per container
HEALTH_CHECKS = {
    'tonalli-api': 'docker exec tonalli-nginx curl -sf http://api:3000/health',
    'tonalli-nginx': 'curl -sf -o /dev/null http://localhost:80',
    'tonalli-redis': 'docker exec tonalli-redis redis-cli ping',
    'tonalli-postgres': 'docker exec tonalli-postgres pg_isready -U tonalli',
}

# Track incidents to avoid duplicate processing
active_incidents = {}


def run_cmd(cmd, timeout=15):
    """Run shell command and return (success, output)."""
    try:
        result = subprocess.run(
            cmd, shell=True, capture_output=True, text=True, timeout=timeout
        )
        return result.returncode == 0, (result.stdout + result.stderr).strip()
    except subprocess.TimeoutExpired:
        return False, f'[timeout after {timeout}s]'
    except Exception as e:
        return False, f'[error: {e}]'


def check_service_health(container):
    """Check if a service is healthy."""
    check_cmd = HEALTH_CHECKS.get(container)
    if not check_cmd:
        # Fallback: check if container is running
        ok, out = run_cmd(f'docker inspect {container} --format "{{{{.State.Running}}}}"')
        return ok and 'true' in out
    ok, _ = run_cmd(check_cmd, timeout=10)
    return ok


def gather_diagnostics(container):
    """Gather diagnostics for Claude (only called when auto-recovery fails)."""
    diag = {}
    diag['docker_ps'] = run_cmd('docker ps --format "table {{.Names}}\\t{{.Status}}"')[1]
    diag['disk'] = run_cmd('df -h / | tail -1')[1]
    diag['memory'] = run_cmd('free -h | head -3')[1]
    diag['load'] = run_cmd('uptime')[1]
    if container:
        diag['container_logs'] = run_cmd(f'docker logs {container} --tail 80 --since 10m 2>&1')[1]
        diag['container_inspect'] = run_cmd(
            f'docker inspect {container} --format "'
            f'Status:{{{{.State.Status}}}} '
            f'Restarting:{{{{.State.Restarting}}}} '
            f'OOMKilled:{{{{.State.OOMKilled}}}} '
            f'ExitCode:{{{{.State.ExitCode}}}} '
            f'StartedAt:{{{{.State.StartedAt}}}}"'
        )[1]
    return diag


def ask_claude(monitor_name, container, diag, attempts_log):
    """Call Claude API only when auto-recovery fails."""
    diag_text = '\n'.join(f'### {k}\n```\n{v}\n```' for k, v in diag.items())
    attempts_text = '\n'.join(f'- {a}' for a in attempts_log)

    prompt = (
        f'Eres el ingeniero de infraestructura de Tonalli (SaaS para restaurantes).\n\n'
        f'El servicio "{monitor_name}" (container: {container}) esta CAIDO.\n'
        f'Ya intentamos auto-recuperacion sin exito:\n{attempts_text}\n\n'
        f'## Diagnosticos:\n{diag_text}\n\n'
        f'Analiza y responde en espanol, MUY conciso (max 5 lineas):\n'
        f'1. Causa probable\n'
        f'2. Que debe hacer el admin para resolverlo\n'
        f'3. Severidad: Critica/Alta/Media'
    )

    body = json.dumps({
        'model': 'claude-haiku-4-5-20251001',
        'max_tokens': 300,
        'messages': [{'role': 'user', 'content': prompt}]
    }).encode()

    req = urllib.request.Request(
        'https://api.anthropic.com/v1/messages',
        data=body,
        headers={
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
        }
    )

    ctx = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
            data = json.loads(resp.read())
            return data['content'][0]['text']
    except Exception as e:
        return f'Error al consultar Claude: {e}'


def send_telegram(message):
    """Send message to Telegram."""
    body = json.dumps({
        'chat_id': TELEGRAM_CHAT_ID,
        'text': message,
        'parse_mode': 'HTML',
    }).encode()

    req = urllib.request.Request(
        f'https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage',
        data=body,
        headers={'Content-Type': 'application/json'}
    )

    ctx = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            return json.loads(resp.read())
    except Exception as e:
        print(f'Telegram error: {e}')
        return None


def handle_down(monitor_name):
    """Handle a service going DOWN."""
    timestamp = time.strftime('%Y-%m-%d %H:%M:%S')
    container = SERVICE_CONTAINERS.get(monitor_name, '')

    # Avoid duplicate processing
    if monitor_name in active_incidents:
        elapsed = time.time() - active_incidents[monitor_name]
        if elapsed < 300:  # Skip if processed < 5 min ago
            print(f'[{timestamp}] SKIP: {monitor_name} already being handled ({elapsed:.0f}s ago)')
            return
    active_incidents[monitor_name] = time.time()

    strategies = RECOVERY_STRATEGIES.get(container, [])
    attempts_log = []

    if not strategies:
        # No recovery strategy, alert immediately
        send_telegram(
            f'\U0001f534 <b>CAIDA: {monitor_name}</b>\n'
            f'Hora: {timestamp}\n'
            f'Sin estrategia de auto-recuperacion para este servicio.'
        )
        return

    # Notify start of auto-recovery
    send_telegram(
        f'\U0001f7e1 <b>CAIDA DETECTADA: {monitor_name}</b>\n'
        f'Hora: {timestamp}\n'
        f'\U0001f527 Intentando recuperacion automatica...'
    )

    # Try each strategy
    for i, (name, cmd) in enumerate(strategies):
        attempt = f'Intento {i+1}: {name}'
        print(f'[{timestamp}] {monitor_name}: {attempt} -> {cmd}')

        ok, output = run_cmd(cmd, timeout=30)
        attempts_log.append(f'{attempt}: {"OK" if ok else "FAILED"} - {output[:100]}')

        # Wait for service to come up
        time.sleep(RETRY_WAIT)

        # Check if recovered
        if check_service_health(container):
            send_telegram(
                f'\U00002705 <b>RECUPERADO: {monitor_name}</b>\n'
                f'Hora: {time.strftime("%Y-%m-%d %H:%M:%S")}\n'
                f'Metodo: {name} (intento {i+1})\n'
                f'Sin necesidad de intervencion manual.'
            )
            print(f'[{timestamp}] RECOVERED: {monitor_name} via {name}')
            del active_incidents[monitor_name]
            return

    # All auto-recovery failed -> ESCALATE TO CLAUDE
    print(f'[{timestamp}] ESCALATING: {monitor_name} -> Claude API')

    diag = gather_diagnostics(container)
    claude_response = ask_claude(monitor_name, container, diag, attempts_log)

    send_telegram(
        f'\U0001f534 <b>NO PUDE RECUPERAR: {monitor_name}</b>\n\n'
        f'<b>Intentos fallidos:</b>\n'
        + '\n'.join(f'  \u2022 {a}' for a in attempts_log)
        + f'\n\n\U0001f916 <b>Diagnostico IA:</b>\n{claude_response}'
    )

    print(f'[{timestamp}] ESCALATED: {monitor_name} - Claude diagnosis sent')


def handle_up(monitor_name):
    """Handle a service coming back UP."""
    timestamp = time.strftime('%Y-%m-%d %H:%M:%S')

    if monitor_name in active_incidents:
        del active_incidents[monitor_name]

    send_telegram(
        f'\U0001f7e2 <b>SERVICIO RECUPERADO: {monitor_name}</b>\n'
        f'Hora: {timestamp}'
    )
    print(f'[{timestamp}] UP: {monitor_name}')


class WebhookHandler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)

        # Respond immediately, process async
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'OK')

        try:
            data = json.loads(body)

            # Parse Uptime Kuma webhook format
            monitor = data.get('monitor', data.get('monitorJSON', {}))
            if isinstance(monitor, str):
                monitor = json.loads(monitor)
            monitor_name = monitor.get('name', 'Unknown')

            heartbeat = data.get('heartbeat', data.get('heartbeatJSON', {}))
            if isinstance(heartbeat, str):
                heartbeat = json.loads(heartbeat)
            status_code = heartbeat.get('status', 1)

            timestamp = time.strftime('%Y-%m-%d %H:%M:%S')
            print(f'[{timestamp}] WEBHOOK: {monitor_name} status={status_code}')

            if status_code == 0:
                handle_down(monitor_name)
            else:
                handle_up(monitor_name)
        except Exception as e:
            timestamp = time.strftime('%Y-%m-%d %H:%M:%S')
            print(f'[{timestamp}] WEBHOOK ERROR: {e}')
            import traceback
            traceback.print_exc()

    def log_message(self, format, *args):
        pass  # Suppress default HTTP logs


if __name__ == '__main__':
    if not ANTHROPIC_API_KEY:
        print('ERROR: ANTHROPIC_API_KEY not set')
        exit(1)
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print('ERROR: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set')
        exit(1)

    print(f'Tonalli Smart Monitor v2.0')
    print(f'  Port: {PORT}')
    print(f'  Telegram: chat {TELEGRAM_CHAT_ID}')
    print(f'  Claude API: configured')
    print(f'  Recovery strategies: {len(RECOVERY_STRATEGIES)} containers')
    print(f'  Listening for webhooks...')

    server = http.server.HTTPServer(('0.0.0.0', PORT), WebhookHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('Shutting down')
        server.server_close()
