// src/lib/server/webpush.js
import webpush from 'web-push';
import { PRIVATE_VAPID_KEY } from '$env/static/private';
import { PUBLIC_VAPID_KEY, PUBLIC_VAPID_SUBJECT } from '$env/static/public';

webpush.setVapidDetails(PUBLIC_VAPID_SUBJECT, PUBLIC_VAPID_KEY, PRIVATE_VAPID_KEY);

export { webpush };
