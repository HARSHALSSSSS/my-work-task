/**
 * SpeedCopy - Start All Services
 * Each service runs as a fully independent child process.
 *
 * Usage:
 *   node scripts/start-all.js          → production (node)
 *   node scripts/start-all.js --dev    → development (nodemon)
 */
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const fs = require('fs');

const isDev = process.argv.includes('--dev');

const services = [
    { name: 'gateway', dir: 'gateway', port: 4000, color: 'cyan' },
    { name: 'auth', dir: 'services/auth-service', port: 4001, color: 'green' },
    { name: 'user', dir: 'services/user-service', port: 4002, color: 'yellow' },
    { name: 'product', dir: 'services/product-service', port: 4003, color: 'blue' },
    { name: 'design', dir: 'services/design-service', port: 4004, color: 'magenta' },
    { name: 'order', dir: 'services/order-service', port: 4005, color: 'white' },
    { name: 'payment', dir: 'services/payment-service', port: 4006, color: 'red' },
    { name: 'notification', dir: 'services/notification-service', port: 4007, color: 'gray' },
    { name: 'admin', dir: 'services/admin-service', port: 4008, color: 'cyan' },
    { name: 'delivery', dir: 'services/delivery-service', port: 4009, color: 'green' },
    { name: 'vendor', dir: 'services/vendor-service', port: 4010, color: 'yellow' },
    { name: 'finance', dir: 'services/finance-service', port: 4011, color: 'magenta' },
];

const root = path.join(__dirname, '..');

const C = {
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    white: '\x1b[37m',
    red: '\x1b[31m',
    gray: '\x1b[90m',
    reset: '\x1b[0m',
    bold: '\x1b[1m',
};

const tag = (name, color) => `${C[color]}[${name}]${C.reset}`;
const line = (len = 50) => '='.repeat(len);

console.log(`\n${C.bold}${line()}${C.reset}`);
console.log(`${C.bold}  SpeedCopy Backend - Starting Services${C.reset}`);
console.log(
    `  Mode: ${isDev ? `${C.yellow}DEVELOPMENT (nodemon)${C.reset}` : `${C.green}PRODUCTION (node)${C.reset}`}`
);
console.log(`${C.bold}${line()}${C.reset}\n`);

const processes = [];

services.forEach((svc) => {
    const cwd = path.join(root, svc.dir);

    // Load this service's own .env so each child gets isolated env vars
    const envFile = path.join(cwd, '.env');
    const svcEnv = { ...process.env };

    if (fs.existsSync(envFile)) {
        fs.readFileSync(envFile, 'utf8')
            .split('\n')
            .forEach((line) => {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#')) {
                    const idx = trimmed.indexOf('=');
                    if (idx > 0) {
                        const key = trimmed.substring(0, idx).trim();
                        const val = trimmed
                            .substring(idx + 1)
                            .trim()
                            .replace(/^["']|["']$/g, '');
                        svcEnv[key] = val;
                    }
                }
            });
    }

    const cmd = isDev ? 'npx' : 'node';
    const args = isDev ? ['nodemon', 'src/server.js'] : ['src/server.js'];

    const proc = spawn(cmd, args, {
        cwd,
        shell: true,
        env: svcEnv,
        // Each child gets its own stdio pipes — no shared module cache
        stdio: ['ignore', 'pipe', 'pipe'],
    });

    processes.push(proc);

    proc.stdout.on('data', (data) => {
        data.toString()
            .trim()
            .split('\n')
            .forEach((l) => {
                if (l.trim()) process.stdout.write(`${tag(svc.name, svc.color)} ${l}\n`);
            });
    });

    proc.stderr.on('data', (data) => {
        data.toString()
            .trim()
            .split('\n')
            .forEach((l) => {
                if (l.trim())
                    process.stdout.write(`${tag(svc.name, svc.color)} ${C.red}${l}${C.reset}\n`);
            });
    });

    proc.on('exit', (code) => {
        if (code !== 0 && code !== null) {
            process.stdout.write(
                `${tag(svc.name, svc.color)} ${C.red}Exited with code ${code}${C.reset}\n`
            );
        }
    });
});

// ─── Poll each service until it responds (max 60s) ────────
const pollService = (svc) =>
    new Promise((resolve) => {
        const deadline = Date.now() + 60000;
        const attempt = () => {
            const req = http.get(
                { hostname: '127.0.0.1', port: svc.port, path: '/health', timeout: 2000 },
                (res) => {
                    if (res.statusCode === 200) resolve({ ...svc, ok: true });
                    else retry();
                }
            );
            req.on('error', retry);
            req.on('timeout', () => {
                req.destroy();
                retry();
            });
        };
        const retry = () => {
            if (Date.now() > deadline) resolve({ ...svc, ok: false });
            else setTimeout(attempt, 1500);
        };
        setTimeout(attempt, 3000);
    });

// ─── Wait for all, print summary ──────────────────────────
Promise.all(services.map(pollService)).then((results) => {
    let allUp = true;
    const rows = results.map(({ name, port, ok }) => {
        if (!ok) allUp = false;
        const status = ok ? `${C.green}✅ UP   ${C.reset}` : `${C.red}❌ DOWN ${C.reset}`;
        return `  ${status}  ${name.padEnd(16)}  http://localhost:${port}`;
    });

    const sep = `${C.bold}${line()}${C.reset}`;
    process.stdout.write(
        [
            '',
            sep,
            `${C.bold}  SpeedCopy Health Check${C.reset}`,
            sep,
            ...rows,
            '',
            allUp
                ? `  ${C.green}${C.bold}🎉 All 12 services are UP!${C.reset}`
                : `  ${C.red}⚠️  Some services failed. Check logs above.${C.reset}`,
            '',
            `  Gateway : http://localhost:4000`,
            `  Swagger : http://localhost:4000/api-docs`,
            ``,
            `  Per-service Swagger:`,
            `  Auth     → http://localhost:4001/api-docs`,
            `  Order    → http://localhost:4005/api-docs`,
            `  Admin    → http://localhost:4008/api-docs`,
            `  Vendor   → http://localhost:4010/api-docs`,
            `  Finance  → http://localhost:4011/api-docs`,
            sep,
            '',
        ].join('\n')
    );
});

// ─── Graceful shutdown ────────────────────────────────────
const shutdown = () => {
    process.stdout.write(`\n${C.yellow}Shutting down...${C.reset}\n`);
    processes.forEach((p) => {
        try {
            p.kill('SIGTERM');
        } catch (_) {}
    });
    setTimeout(() => process.exit(0), 1000);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
