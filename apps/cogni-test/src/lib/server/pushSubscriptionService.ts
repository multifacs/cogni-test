// src/lib/server/pushSubscriptionService.js
import { db } from '$lib/server/db';
import { pushSubscriptions } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { PushSubscription } from 'web-push';

export class PushSubscriptionService {
	async saveSubscription(
		subscriptionData: PushSubscription,
		userId: string | null = null,
		userAgent: string | null = null
	) {
		try {
			// Extract keys from subscription
			const { endpoint, keys } = subscriptionData;
			const { p256dh, auth } = keys;

			// Check if subscription already exists
			const existing = await this.getSubscriptionByEndpoint(endpoint);

			if (existing) {
				// Update existing subscription
				await db
					.update(pushSubscriptions)
					.set({
						p256dh,
						auth,
						userAgent,
						updatedAt: new Date(),
						isActive: true
					})
					.where(eq(pushSubscriptions.endpoint, endpoint));

				return existing.id;
			} else {
				// Create new subscription
				const result = await db
					.insert(pushSubscriptions)
					.values({
						userId,
						endpoint,
						p256dh,
						auth,
						userAgent,
						createdAt: new Date(),
						updatedAt: new Date(),
						isActive: true
					})
					.returning({ id: pushSubscriptions.id });

				return result[0].id;
			}
		} catch (error) {
			console.error('Error saving subscription:', error);
			throw error;
		}
	}

	async getSubscriptionByEndpoint(endpoint: string) {
		try {
			const result = await db
				.select()
				.from(pushSubscriptions)
				.where(eq(pushSubscriptions.endpoint, endpoint))
				.limit(1);

			return result[0] || null;
		} catch (error) {
			console.error('Error getting subscription:', error);
			throw error;
		}
	}

	async getAllActiveSubscriptions(userId = null) {
		try {
			const conditions = [eq(pushSubscriptions.isActive, true)];

			if (userId) {
				conditions.push(eq(pushSubscriptions.userId, userId));
			}

			const result = await db
				.select()
				.from(pushSubscriptions)
				.where(and(...conditions));

			return result.map((sub) => ({
				endpoint: sub.endpoint,
				keys: {
					p256dh: sub.p256dh,
					auth: sub.auth
				}
			}));
		} catch (error) {
			console.error('Error getting active subscriptions:', error);
			throw error;
		}
	}

	async deactivateSubscription(endpoint: string) {
		try {
			await db
				.update(pushSubscriptions)
				.set({
					isActive: false,
					updatedAt: new Date()
				})
				.where(eq(pushSubscriptions.endpoint, endpoint));
		} catch (error) {
			console.error('Error deactivating subscription:', error);
			throw error;
		}
	}

	async removeSubscription(endpoint: string) {
		try {
			await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
		} catch (error) {
			console.error('Error removing subscription:', error);
			throw error;
		}
	}

	async cleanupExpiredSubscriptions() {
		// Remove subscriptions older than 90 days and inactive
		const ninetyDaysAgo = new Date();
		ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

		try {
			await db.delete(pushSubscriptions).where(
				and(
					eq(pushSubscriptions.isActive, false)
					// Note: SQLite doesn't have built-in date functions like this
					// You might need to store timestamps as integers and compare
				)
			);
		} catch (error) {
			console.error('Error cleaning up subscriptions:', error);
			throw error;
		}
	}
}
