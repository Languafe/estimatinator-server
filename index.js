require('dotenv').config();

const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

const sessions = {};

io.on('connection', (socket) => {
  const { session, username } = socket.handshake.query;
  if (!session || !username) {
    return; // bad handshake, ignore
  }
  else {
    socket.join(session);
    const currentUser = {
      id: socket.id,
      username: username
    };
    let currentSession = sessions[session];
    if (!currentSession) {
      currentSession = sessions[session] = {
        users: [currentUser]
      };
    }
    else {
      currentSession.users = [...currentSession.users, currentUser];
    }

    io.to(session).emit('users', currentSession.users);
    io.to(session).emit('joined', currentUser);
    
    socket.on('disconnect', () => {
      currentSession.users = currentSession.users.filter(
        u => u.id !== socket.id
      );
      io.to(session).emit('users', currentSession.users);
      io.to(session).emit('left', currentUser);
    });
  }
});

const port = process.env.PORT || 3000;

http.listen(port, () => {
  console.log(`listening on *:${port}`);
});
