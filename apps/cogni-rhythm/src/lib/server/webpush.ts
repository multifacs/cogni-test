// src/lib/server/webpush.js
import webpush from 'web-push';

import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private'; 

if (privateEnv.PRIVATE_VAPID_KEY && publicEnv.PUBLIC_VAPID_KEY && publicEnv.PUBLIC_VAPID_SUBJECT) {
    webpush.setVapidDetails(publicEnv.PUBLIC_VAPID_SUBJECT, publicEnv.PUBLIC_VAPID_KEY, privateEnv.PRIVATE_VAPID_KEY);
}

export { webpush };
