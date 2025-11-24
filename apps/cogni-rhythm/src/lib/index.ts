import localforage from 'localforage';
import type { RhythmResult } from '$lib/rhythm/types';

// place files you want to import through the `$lib` alias in this folder.
export async function uploadResultsToDatabase() {
	try {
		// Get user ID from localforage
		const user = await localforage.getItem('user');
		if (!user || !user.id) {
			console.error('No user ID found');
			return;
		}
		const userId = user.id;

		// Try to upload easy results
		const resultsEasyLoaded: RhythmResult[] | null = await localforage.getItem('results-easy');
		if (resultsEasyLoaded && resultsEasyLoaded.length > 0) {
			try {
				const response = await fetch('/api/rhythm/results', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						userId,
						difficulty: 'easy',
						results: resultsEasyLoaded
					})
				});

				if (response.ok) {
					console.log('Easy results uploaded successfully');
				} else {
					console.error('Failed to upload easy results:', await response.text());
				}
			} catch (error) {
				console.error('Error uploading easy results:', error);
			}
		}

		// Try to upload medium results
		const resultsMediumLoaded: RhythmResult[] | null = await localforage.getItem('results-medium');
		if (resultsMediumLoaded && resultsMediumLoaded.length > 0) {
			try {
				const response = await fetch('/api/rhythm/results', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						userId,
						difficulty: 'medium',
						results: resultsMediumLoaded
					})
				});

				if (response.ok) {
					console.log('Medium results uploaded successfully');
				} else {
					console.error('Failed to upload medium results:', await response.text());
				}
			} catch (error) {
				console.error('Error uploading medium results:', error);
			}
		}

		// Try to upload hard results
		const resultsHardLoaded: RhythmResult[] | null = await localforage.getItem('results-hard');
		if (resultsHardLoaded && resultsHardLoaded.length > 0) {
			try {
				const response = await fetch('/api/rhythm/results', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						userId,
						difficulty: 'hard',
						results: resultsHardLoaded
					})
				});

				if (response.ok) {
					console.log('Hard results uploaded successfully');
				} else {
					console.error('Failed to upload hard results:', await response.text());
				}
			} catch (error) {
				console.error('Error uploading hard results:', error);
			}
		}
	} catch (error) {
		console.error('Error in uploadResultsToDatabase:', error);
	}
}
