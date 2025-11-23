import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import localforage from 'localforage';

export const user = writable(null);

export const isAuthenticated = writable(false);

// User functions
export const userManager = {
	// Save user to IndexedDB
	async login(userData) {
		try {
			await localforage.setItem('user', userData);
			user.set(userData);
			isAuthenticated.set(true);
			return true;
		} catch (err) {
			console.error('Error saving user:', err);
			return false;
		}
	},

	// Logout user
	async logout() {
		try {
			await localforage.removeItem('user');
			user.set(null);
			isAuthenticated.set(false);
			return true;
		} catch (err) {
			console.error('Error logging out:', err);
			return false;
		}
	},

	// Check if user is logged in (on app start)
	async checkAuth() {
		try {
			const userData = await localforage.getItem('user');
			if (userData) {
				user.set(userData);
				isAuthenticated.set(true);
				return true;
			}
			return false;
		} catch (err) {
			console.error('Error checking auth:', err);
			return false;
		}
	},

	// Get current user
	async getCurrentUser() {
		return await localforage.getItem('user');
	}
};
