/* eslint-disable no-constant-condition */
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

		const resultsEasyUploaded: RhythmResult[] | null =
			await localforage.getItem('results-easy-uploaded');

		if (!resultsEasyUploaded || true) {
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
						await localforage.setItem('results-easy-uploaded', true);
					} else {
						console.error('Failed to upload easy results:', await response.text());
					}
				} catch (error) {
					console.error('Error uploading easy results:', error);
				}
			}
		}

		const resultsMediumUploaded: RhythmResult[] | null =
			await localforage.getItem('results-medium-uploaded');

		if (!resultsMediumUploaded || true) {
			// Try to upload medium results
			const resultsMediumLoaded: RhythmResult[] | null =
				await localforage.getItem('results-medium');
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
						await localforage.setItem('results-medium-uploaded', true);
					} else {
						console.error('Failed to upload medium results:', await response.text());
					}
				} catch (error) {
					console.error('Error uploading medium results:', error);
				}
			}
		}

		const resultsHardUploaded: RhythmResult[] | null =
			await localforage.getItem('results-hard-uploaded');

		if (!resultsHardUploaded || true) {
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
						await localforage.setItem('results-hard-uploaded', true);
					} else {
						console.error('Failed to upload hard results:', await response.text());
					}
				} catch (error) {
					console.error('Error uploading hard results:', error);
				}
			}
		}

		// return `Результаты легкого уровня загружены: ${resultsEasyUploaded ? 'да' : 'нет'}_Результаты среднего уровня загружены: ${resultsMediumUploaded ? 'да' : 'нет'}_Результаты сложного уровня загружены: ${resultsHardUploaded ? 'да' : 'нет'}`;
		return true;
	} catch (error) {
		console.error('Error in uploadResultsToDatabase:', error);
		return false;
	}
}
