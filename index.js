import { createServer } from 'https';
import { handler } from './build/handler.js'; // путь зависит от версии сборки

createServer(handler).listen(() => {
	console.log('✅ HTTP сервер запущен');
});
