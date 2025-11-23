// src/hooks.server.ts
import { Worker } from 'node:worker_threads';

let worker: Worker | null = null;
let started = false;

export const handle = async ({ event, resolve }) => {
    if (!started) {
        started = true;

        worker = new Worker(
            new URL('./lib/server/worker.ts', import.meta.url), // compiled JS file
        );

        console.log("Worker started");
    }

    return resolve(event);
};
