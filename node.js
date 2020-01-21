const http = require('http');

const server = http.createServer();

server.on('request', async (req, res) => {
  console.log(req, res);
  res.status = 200;
  res.end('hello world');
});

server.listen(4000, () => { console.log('listen 4000') });