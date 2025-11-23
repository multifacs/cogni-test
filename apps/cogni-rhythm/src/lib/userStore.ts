import { writable } from 'svelte/store';
import type { Writable } from 'svelte/store';
import localforage from 'localforage';

type User = {
	id: string;
	firstname: string;
	lastname: string;
	birthdate: string;
	sex: 'male' | 'female';
};

export const user: Writable<User | null> = writable(null);

export const isAuthenticated = writable(false);

// User functions
export const userManager = {
	// Save user to IndexedDB
	async login(userData: User) {
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
			const userData: User | null = await localforage.getItem('user');
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
