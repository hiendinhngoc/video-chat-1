require('dotenv').config()
var Hapi = require('hapi');
var server = new Hapi.Server()
server.connection({
  // 'host': 'glacial-sierra-23235.herokuapp.com' || 'localhost',
  'port': process.env.PORT || 3000
});
var socketio = require("socket.io");
var io = socketio(server.listener);
var twilio = require('twilio')(process.env.ACCOUNT_SID, process.env.AUTH_TOKEN);

// Serve static assets
server.route({
  method: 'GET',
  path: '/{path*}',
  handler: {
    directory: { path: './public', listing: false, index: true }
  }
});

// When a socket connects, set up the specific listeners we will use.
io.on('connection', function(socket){
  console.log("LOG: just connected: " + socket.id);
  // When a client tries to join a room, only allow them if they are first or
  // second in the room. Otherwise it is full.
  socket.on('join', function(room){
    var clients = io.sockets.adapter.rooms[room];
    console.log('clients: ', clients);
    var numClients = (typeof clients !== 'undefined') ? (Object.values(clients)[1]) : 0;
    console.log("numClients: ", numClients);
    if(numClients == 0){
      console.log('[socket]','join room [0]:',room);
      socket.join(room);
    }else if(numClients == 1){
      console.log('[socket]','join room [1]:',room)
      socket.join(room);
      // When the client is second to join the room, both clients are ready.
      socket.emit('ready', room);
      socket.broadcast.emit('ready', room);
    }else{
      console.log('[socket]','full room :',room)
      socket.emit('full', room);
    }
  });

  // When receiving the token message, use the Twilio REST API to request an
  // token to get ephemeral credentials to use the TURN server.
  socket.on('token', function(){
    twilio.tokens.create(function(err, response){
      if(err){
        console.log(err);
      }else{
        // Return the token to the browser.
        socket.emit('token', response);
      }
    });
  });

  // Relay candidate messages
  socket.on('candidate', function(candidate){
    socket.broadcast.emit('candidate', candidate);
  });

  // Relay offers
  socket.on('offer', function(offer){
    socket.broadcast.emit('offer', offer);
  });

  // Relay answers
  socket.on('answer', function(answer){
    socket.broadcast.emit('answer', answer);
  });
});

// Start the server
server.start(function () {
  console.log('Server running at:', server.info.uri);
});
