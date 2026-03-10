import dotenv from "dotenv";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import compress from "@fastify/compress";
import fastifyCookie from "@fastify/cookie";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { logging, server as wisp } from "@mercuryworkshop/wisp-js/server";
import { createBareServer } from "@tomphttp/bare-server-node";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const port = process.env.PORT || 3000;
const server = createServer();
const bare = process.env.BARE !== "false" ? createBareServer("/seal/") : null;
logging.set_level(logging.NONE);
const dnsServers = (process.env.WISP_DNS_SERVERS || "1.1.1.1,1.0.0.1")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

Object.assign(wisp.options, {
  dns_method: "resolve",
  dns_servers: dnsServers,
  dns_result_order: "ipv4first"
});

server.on("upgrade", (req, sock, head) =>
  bare?.shouldRoute(req)
    ? bare.routeUpgrade(req, sock, head)
    : req.url.endsWith("/wisp/")
      ? wisp.routeRequest(req, sock, head)
      : sock.end()
);

const app = Fastify({
  serverFactory: h => {
    server.on("request", (req, res) =>
      bare?.shouldRoute(req) ? bare.routeRequest(req, res) : h(req, res)
    );
    return server;
  },
  logger: false,
  keepAliveTimeout: 30000,
  connectionTimeout: 60000,
  forceCloseConnections: true
});

await app.register(fastifyCookie);
await app.register(compress, { global: true, encodings: ['gzip','deflate','br'] });

app.register(fastifyStatic, {
  root: join(__dirname, "dist"),
  prefix: "/",
  decorateReply: true,
  etag: true,
  lastModified: true,
  cacheControl: true,
  setHeaders(res, path) {
    if (path.endsWith(".html")) {
      res.setHeader("Cache-Control", "no-cache, must-revalidate");
    } else if (/\.[a-f0-9]{8,}\./.test(path)) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    } else {
      res.setHeader("Cache-Control", "public, max-age=3600");
    }
  }
});

const proxy = (url, type = "application/javascript") => async (req, reply) => {
  try {
    const res = await fetch(url(req));
    if (!res.ok) return reply.code(res.status).send();

    const hop = [
      "connection",
      "keep-alive",
      "proxy-authenticate",
      "proxy-authorization",
      "te",
      "trailer",
      "transfer-encoding",
      "upgrade"
    ];
    for (const [k, v] of res.headers) {
      if (!hop.includes(k.toLowerCase())) reply.header(k, v);
    }

    if (res.headers.getSetCookie) {
      const cookies = res.headers.getSetCookie();
      if (cookies.length) reply.header("set-cookie", cookies);
    }

    if (!res.headers.get("content-type")) reply.type(type);

    return reply.send(res.body);
  } catch {
    return reply.code(500).send();
  }
};

app.get("/assets/img/*", proxy(req => `https://dogeub-assets.pages.dev/img/${req.params["*"]}`, ""));
app.get("/assets-fb/*", proxy(req => `https://dogeub-assets.ftp.sh/${req.params["*"]}`, ""));

// Keep /js/script.js non-fatal if the upstream host is down.
app.get("/js/script.js", async (req, reply) => {
  const source = process.env.BYOD_SCRIPT_URL || "https://byod.privatedns.org/js/script.js";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(source, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const hop = [
        "connection",
        "keep-alive",
        "proxy-authenticate",
        "proxy-authorization",
        "te",
        "trailer",
        "transfer-encoding",
        "upgrade"
      ];

      for (const [k, v] of res.headers) {
        if (!hop.includes(k.toLowerCase())) reply.header(k, v);
      }

      if (!res.headers.get("content-type")) {
        reply.type("application/javascript; charset=utf-8");
      }

      return reply.send(res.body);
    }
  } catch {
    // Fall through to local fallback script.
  }

  reply
    .type("application/javascript; charset=utf-8")
    .header("cache-control", "no-store")
    .send(
      "window.__BYOD_SCRIPT_UNAVAILABLE__=true;console.warn('Upstream /js/script.js is unavailable; using fallback.');"
    );
});
app.get("/ds", (req, res) => res.redirect("https://discord.gg/ZBef7HnAeg"));
app.get("/return", async (req, reply) =>
  req.query?.q
    ? fetch(`https://duckduckgo.com/ac/?q=${encodeURIComponent(req.query.q)}`)
        .then(r => r.json())
        .catch(() => reply.code(500).send({ error: "request failed" }))
    : reply.code(401).send({ error: "query parameter?" })
);

app.setNotFoundHandler((req, reply) =>
  req.raw.method === "GET" && req.headers.accept?.includes("text/html")
    ? reply.sendFile("index.html")
    : reply.code(404).send({ error: "Not Found" })
);

// Start the server - minimal change for Render compatibility
app.listen({ port, host: '0.0.0.0' }).then(() => {
  console.log(`Server running on 0.0.0.0:${port}`);
}).catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
