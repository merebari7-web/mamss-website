/* Local preview/test server. GitHub Pages remains the production host. */
const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path"),
  zlib = require("node:zlib");
const root = path.resolve(__dirname, ".."),
  cache = new Map();
function server(prefix = "/") {
  return http.createServer((req, res) => {
    let uri;
    try {
      uri = decodeURIComponent(new URL(req.url, "http://test").pathname);
    } catch {
      res.writeHead(400);
      return res.end();
    }
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405);
      return res.end();
    }
    if (!uri.startsWith(prefix)) {
      res.writeHead(404);
      return res.end("Not found");
    }
    const rel = uri.slice(prefix.length) || "index.html";
    if (
      rel.split("/").some((p) => p.startsWith(".")) ||
      rel.includes("node_modules")
    ) {
      res.writeHead(404);
      return res.end("Not found");
    }
    const file = path.resolve(root, rel);
    if (
      !file.startsWith(root + path.sep) ||
      !fs.existsSync(file) ||
      !fs.statSync(file).isFile()
    ) {
      res.writeHead(404);
      return res.end("Not found");
    }
    const ext = path.extname(file),
      type =
        {
          ".html": "text/html; charset=utf-8",
          ".css": "text/css; charset=utf-8",
          ".js": "application/javascript; charset=utf-8",
          ".json": "application/json",
          ".webmanifest": "application/manifest+json",
          ".webp": "image/webp",
          ".png": "image/png",
          ".svg": "image/svg+xml",
          ".woff2": "font/woff2",
          ".txt": "text/plain; charset=utf-8",
        }[ext] || "text/plain";
    let content = fs.readFileSync(file);
    res.setHeader("Content-Type", type);
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Vary", "Accept-Encoding");
    if (
      /gzip/.test(req.headers["accept-encoding"] || "") &&
      /html|css|javascript|json|svg/.test(type)
    ) {
      const m = fs.statSync(file).mtimeMs;
      let cached = cache.get(file);
      if (!cached || cached.m !== m) {
        cached = { m, data: zlib.gzipSync(content, { level: 9 }) };
        cache.set(file, cached);
      }
      content = cached.data;
      res.setHeader("Content-Encoding", "gzip");
    }
    res.setHeader("Content-Length", content.length);
    res.writeHead(200);
    res.end(req.method === "HEAD" ? undefined : content);
  });
}
module.exports = server;
if (require.main === module) {
  const port = Number(process.env.PORT) || 8230;
  server().listen(port, "0.0.0.0", () =>
    console.log("MAMSS website on port " + port),
  );
}
