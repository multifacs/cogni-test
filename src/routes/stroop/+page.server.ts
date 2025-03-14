import { getRecords } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async (loadEvent) => {
  const { fetch } = loadEvent;
  const tracks = await (await fetch("api/db")).json();
  return {
    tracks,
  };
}) satisfies PageServerLoad;