import { sendJson } from "./_shared.js";

export default function handler(_req, res) {
  return sendJson(res, 200, {
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
