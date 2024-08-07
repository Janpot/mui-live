import invariant from "invariant";
import * as fs from "node:fs";
import * as http from "node:http";
import * as path from "node:path";
import * as url from "node:url";
import { Readable } from "node:stream";

const currentDirectory = path.dirname(url.fileURLToPath(import.meta.url));

const PORT = 8000;

const MIME_TYPES: Record<string, string | undefined> = {
  default: "application/octet-stream",
  html: "text/html; charset=UTF-8",
  js: "application/javascript",
  css: "text/css",
  png: "image/png",
  jpg: "image/jpg",
  gif: "image/gif",
  ico: "image/x-icon",
  svg: "image/svg+xml",
};

const STATIC_PATH = path.join(currentDirectory, "../editor");

const toBool = [() => true, () => false];

const prepareFile = async (url: string) => {
  const paths = [STATIC_PATH, url];
  if (url.endsWith("/")) paths.push("index.html");
  const filePath = path.join(...paths);
  const pathTraversal = !filePath.startsWith(STATIC_PATH);
  const exists = await fs.promises.access(filePath).then(...toBool);
  const found = !pathTraversal && exists;

  if (found) {
    const ext = path.extname(filePath).substring(1).toLowerCase();
    const mimeType = MIME_TYPES[ext] || MIME_TYPES.default;
    return {
      status: 200,
      mimeType,
      stream: fs.createReadStream(filePath),
    };
  } else {
    return {
      status: 404,
      mimeType: MIME_TYPES.html,
      stream: Readable.from("Not Found"),
    };
  }
};

http
  .createServer(async (req, res) => {
    invariant(req.url, "URL is required");
    const { status, mimeType, stream } = await prepareFile(req.url);
    res.writeHead(status, { "Content-Type": mimeType });
    stream.pipe(res);
    console.log(`${req.method} ${req.url} ${status}`);
  })
  .listen(PORT);

console.log(`Server running at http://127.0.0.1:${PORT}/`);
