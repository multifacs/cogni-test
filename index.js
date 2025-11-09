// import { readFileSync } from 'fs';
import { createServer } from 'https';
import { handler } from './build/handler.js'; // путь зависит от версии сборки

// const options = {
// 	key: readFileSync('/etc/ssl/private/cogni-test.ru_private_key.pem'),
// 	cert: readFileSync('/etc/ssl/certs/cogni-test.ru_cert.pem') // проверь, что путь правильный
// };

const port = process.env.PORT || 3000;

// createServer(options, handler).listen(port, () => {
// 	console.log('✅ HTTPS сервер запущен на localhost:' + port);
// });

createServer(handler).listen(port, () => {
	console.log('✅ HTTPS сервер запущен на localhost:' + port);
});