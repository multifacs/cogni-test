import type { User } from '$lib/server/db/types';
import { writable, type Writable } from 'svelte/store';

// Инициализируем хранилище с начальным значением
export const userStore: Writable<User | null> = writable(null);
