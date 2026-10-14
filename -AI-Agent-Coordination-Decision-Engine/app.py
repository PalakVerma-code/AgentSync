"""Local HR agent API for the Workflow Decision Making System."""

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from agents import analyze_employee


MAX_REQUEST_BYTES = 1_000_000


class HRRequestHandler(BaseHTTPRequestHandler):
    def _send_json(self, status, payload):
        encoded = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(encoded)

    def do_GET(self):
        if self.path != "/health":
            self._send_json(404, {"error": "Endpoint not found."})
            return
        self._send_json(200, {"status": "HEALTHY_ONLINE", "service": "Workflow Decision Making System HR agents"})

    def do_POST(self):
        if self.path != "/analyze":
            self._send_json(404, {"error": "Endpoint not found."})
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self._send_json(400, {"error": "Content-Length must be a valid integer."})
            return
        if content_length <= 0 or content_length > MAX_REQUEST_BYTES:
            self._send_json(413, {"error": "Request body must be between 1 byte and 1 MB."})
            return

        try:
            body = json.loads(self.rfile.read(content_length))
        except (json.JSONDecodeError, UnicodeDecodeError):
            self._send_json(400, {"error": "Request body must be valid JSON."})
            return
        if not isinstance(body, dict):
            self._send_json(400, {"error": "Request body must be a JSON object."})
            return

        employee = body.get("employee")
        project = body.get("project")
        if not isinstance(employee, dict) or not (
            isinstance(employee.get("id"), str) or isinstance(employee.get("name"), str)
        ):
            self._send_json(
                400,
                {"error": "An employee object with a string id or name is required."},
            )
            return
        if project is not None and not isinstance(project, dict):
            self._send_json(400, {"error": "Project must be an object or null."})
            return

        self._send_json(200, analyze_employee(employee, project))

    def log_message(self, format, *args):
        print("[Workflow Decision Making System HR API] %s - %s" % (self.address_string(), format % args))


def main():
    host = "127.0.0.1"
    port = 8000
    server = ThreadingHTTPServer((host, port), HRRequestHandler)
    print(f"[Workflow Decision Making System HR API] Online at http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[Workflow Decision Making System HR API] Shutting down.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
