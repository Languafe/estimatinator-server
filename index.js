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

    socket.on('vote', (vote) => {
      currentSession.users = currentSession.users.map(u => {
        return u.id === currentUser.id ? { ...u, vote } : u;
      });

      io.to(session).emit('users', currentSession.users);
      
      let numVotes = 0;
      currentSession.users.forEach(u => {
        if (u.vote) {
          numVotes++;
        }
      });
      if (numVotes === currentSession.users.length) {
        io.to(session).emit('reveal');
      }
    });

    socket.on('reset', () => {
      currentSession.users.forEach(u => {
        delete u.vote;
      });

      io.to(session).emit('reset');
      io.to(session).emit('users', currentSession.users);
    });

    socket.on('reveal', () => {
      io.to(session).emit('reveal');
    });

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
