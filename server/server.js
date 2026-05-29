const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());

app.use(express.static(path.join(__dirname, '../client')));

const server = http.createServer(app);

const io = new Server(server, {
cors: {
origin: '*'
}
});

let waitingPlayer = null;

const rooms = new Map();

io.on('connection', (socket) => {

console.log('CONNECTED:', socket.id);

socket.on('find_match', ({ name }) => {

if (waitingPlayer && waitingPlayer.id !== socket.id) {

  const roomId = 'room_' + Date.now();

  const room = {
    id: roomId,
    board: Array(9).fill(null),
    turn: 'X',

    playerX: {
      id: waitingPlayer.id,
      name: waitingPlayer.name
    },

    playerO: {
      id: socket.id,
      name: name
    }
  };

  rooms.set(roomId, room);

  waitingPlayer.socket.join(roomId);

  socket.join(roomId);

  io.to(roomId).emit('match_found', room);

  waitingPlayer = null;

} else {

  waitingPlayer = {
    id: socket.id,
    name,
    socket
  };
}

});

socket.on('make_move', ({ roomId, cell, symbol }) => {

const room = rooms.get(roomId);

if (!room) return;

if (room.board[cell] !== null) return;

room.board[cell] = symbol;

io.to(roomId).emit('move_made', {
  cell,
  symbol
});

room.turn = symbol === 'X' ? 'O' : 'X';

io.to(roomId).emit('turn_change', room.turn);

});

socket.on('disconnect', () => {

console.log('DISCONNECTED:', socket.id);

if (waitingPlayer && waitingPlayer.id === socket.id) {
  waitingPlayer = null;
}

});
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
console.log('SERVER RUNNING ON PORT', PORT);
});