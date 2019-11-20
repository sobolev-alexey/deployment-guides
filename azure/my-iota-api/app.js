const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const port = process.env.PORT || 3001;

app.get('/', (req, res) => res.send('Hello World!'))

io.on('connection', function (socket) {
  socket.on('message', function (data) {
      socket.emit('message', 'pong');
  });
});


server.listen(port, () => console.log(`Example api listening on port ${port}!`));

