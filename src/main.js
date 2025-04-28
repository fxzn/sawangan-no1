// import { loggerApp } from './application/logger.js';
// import { web } from './application/web.js';


// web.listen(3000, () => {
//   loggerApp.info('Server started on port 3000');
// });


import { web } from './application/web.js';

// Jangan listen, cukup export default
export default web;
