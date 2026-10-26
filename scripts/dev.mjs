// Live sync: recompiles TS on save and serves the result to Studio's Rojo
// plugin. Usage: npm run dev   (then Plugins → Rojo → Connect in Studio)
//
// `npm run dev` compiles once before this runs, so out/ and include/ exist
// when Rojo reads the project; it refuses to serve paths that aren't there.
import { spawn, spawnSync } from "node:child_process";

const tasks = [
	{ name: "rbxtsc", command: "rbxtsc -w" },
	{ name: "rojo", command: "rojo serve default.project.json" },
];

const width = Math.max(...tasks.map((t) => t.name.length));
const children = [];
let stopping = false;

// Each line gets its task's name, so interleaved output stays readable.
function pipe(stream, out, name) {
	let pending = "";
	stream.setEncoding("utf8");
	stream.on("data", (chunk) => {
		const lines = (pending + chunk).split(/\r?\n/);
		pending = lines.pop();
		for (const line of lines) out.write(`[${name.padEnd(width)}] ${line}\n`);
	});
	stream.on("end", () => {
		if (pending) out.write(`[${name.padEnd(width)}] ${pending}\n`);
	});
}

// With shell: true the child is a shell wrapping the real process, and on
// Windows killing the shell leaves its child running; taskkill /T takes the tree.
function kill(child) {
	if (child.exitCode !== null) return;
	if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
	else child.kill("SIGTERM");
}

// Half a dev loop is worse than none: a watcher with no server (or the
// reverse) looks alive while Studio stops updating. One exits, both stop.
function stopAll(code) {
	if (stopping) return;
	stopping = true;
	for (const child of children) kill(child);
	process.exitCode = code;
}

for (const { name, command } of tasks) {
	// shell: true resolves rbxtsc from node_modules/.bin (npm puts it on PATH)
	// and rojo from Rokit's shims, .cmd or .exe alike.
	const child = spawn(command, { shell: true, stdio: ["ignore", "pipe", "pipe"] });
	pipe(child.stdout, process.stdout, name);
	pipe(child.stderr, process.stderr, name);
	child.on("error", (err) => {
		console.error(`[${name.padEnd(width)}] could not start: ${err.message}`);
		stopAll(1);
	});
	child.on("exit", (code) => {
		if (!stopping) console.error(`[${name.padEnd(width)}] exited (${code ?? "signal"}); stopping the rest.`);
		stopAll(code ?? 1);
	});
	children.push(child);
}

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));
