let timer: NodeJS.Timeout | undefined;

self.onmessage = (e) => {
	switch (e.data) {
		case 'start':
			if (!timer) {
				timer = setInterval(() => {
					self.postMessage('tick');
				}, 1000);
			}
			break;
		case 'stop':
			clearInterval(timer);
			timer = undefined;
			break;
	}
};
