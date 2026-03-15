// src/lib/server/webpush.js
import webpush from 'web-push';

const { PRIVATE_VAPID_KEY } = await import('$env/dynamic/private');
const { PUBLIC_VAPID_KEY } = await import('$env/dynamic/public');
const { PUBLIC_VAPID_SUBJECT } = await import('$env/dynamic/public');

if (PRIVATE_VAPID_KEY && PUBLIC_VAPID_KEY && PUBLIC_VAPID_SUBJECT) {
    webpush.setVapidDetails(PUBLIC_VAPID_SUBJECT, PUBLIC_VAPID_KEY, PRIVATE_VAPID_KEY);
}

export { webpush };
