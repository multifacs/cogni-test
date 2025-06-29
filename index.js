import { readFileSync } from 'fs';
import { createServer } from 'https';
import { handler } from './build/handler.js'; // путь зависит от версии сборки

const options = {
	key: readFileSync('/etc/ssl/private/cogni-test.ru_private_key.pem'),
	cert: readFileSync('/etc/ssl/certs/cogni-test.ru_cert.pem') // проверь, что путь правильный
};

createServer(options, handler).listen(443, () => {
	console.log('✅ HTTPS сервер запущен на https://cogni-test.ru');
});
