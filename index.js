import { createServer } from 'https';
import { handler } from './build/handler.js'; // путь зависит от версии сборки

createServer(handler).listen(80, () => {
	console.log('✅ HTTP сервер запущен');
});
