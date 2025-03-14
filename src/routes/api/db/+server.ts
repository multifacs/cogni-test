import { getRecords, makeRecord } from '$lib/server/db';
import { json } from '@sveltejs/kit';

export function GET() {
    const result = getRecords();
    return json(result);
}

export async function POST(requestEvent) {
    const { request } = requestEvent;
    const { score } = await request.json();
    makeRecord(score);
    return new Response("", { status: 201 });
}