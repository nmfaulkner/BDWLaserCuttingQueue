var http = require('http');
var express = require('express')
var app = express();
var server = http.createServer(app);
var path = require('path');
var http = require('http');
var anyDB = require('any-db');
var env = require('dotenv/config');
const nodemailer = require('nodemailer');
const xoauth2 = require('xoauth2');

var io = require('socket.io').listen(server);
server.listen(8080, function () {
  console.log("Listening on port 8080")
});

app.use("/", express.static(__dirname));

var conn = anyDB.createConnection('sqlite3://db/users.db');

var io = require('socket.io').listen(server);

var q = [];
var ls_1, ls_2;
var ids = new Map();

var hr = (new Date()).getHours();

var ticking;

function sendEmail(userEmail){

  nodemailer.createTestAccount((err, account) => {
      // create reusable transporter object using the default SMTP transport
      let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'bdwautomation@gmail.com',
          pass: process.env.EMAIL_PASSWORD
        }
      });

      // setup email data with unicode symbols
      let mailOptions = {
          from: '"Brown Design Workshop" <bdwautomation@gmail.com>', // sender address
          to: userEmail, // list of receivers
          subject: 'You\'re Next in Line for the Laser Cutter!', // Subject line
          text: 'You are next in line for the BDW laser cutters. Please head over to the design workshop.', // plain text body
      };

      // send mail with defined transport object
      transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
              return console.log(error);
          }

          else{
            console.log("Message Sent");
          }

      });
  });

};

io.sockets.on('connection', function(socket) {


  socket.emit('handshake', q); // Sends the newly connected client current state of the queue

  socket.on("signin", function() {
    calculateTime();
    socket.emit('handshake', q);
  });

  socket.on('join', function(username, length, pnum, email) { // Fired by client when it joins the queue

    ids.set(email, username);

    var cred = {
      'username': username,
      'id' : socket.id,
      'cut_length' : length, // needed to change this bc .length is already a function
      'phone_number': pnum,
      "time_remaining": null,
      'email' : email
    };

    q.push(cred);

    if(q.length === 1) {
      ticking = setInterval(function () {tickCurrentUsers();}, (5*60000));
    }

    calculateTime();

    io.sockets.emit('joined', q);

    pulltoCutter();
  });

  socket.on('delete-user', function(userEmail) {
    console.log("should delete");
    if(q.length === 0) {
      if(ticking != null) {
        clearInterval(ticking);
      }
  }

  removeUser(userEmail);
  socket.emit('deleted', ids.get(userEmail), q);




  });

  socket.on('up-next', function(userEmail){
    sendEmail(userEmail);
  });

});

app.get('/', function(request, response){
    console.log('- Request received:', request.method, request.url);
    response.sendFile(path.join(__dirname + '/index.html'));
});

// Function that handles user signup.
// Takes Post request '.../userJoin and with parameters name, email, isbrown(0 or 1 boolean)
// Inserts the credentials to server database and notifies the user if failed.
app.post('/userJoin', function(req, res) {
  var stmt = "INSERT INTO user(name, email, isbrown) VALUES($1, $2, $3)";
  conn.query(stmt, [req.body.name, req.body.email, req.body.isbrown], function(err, res) {
    if (err) res.status(500).render("Something went wrong. Try again");
    else res.render('index.html', {form:true});
  });
});

app.get('*', function(request, response){
  response.status(404).send('<h1>Error: 404</h1>');
});

// Function Declarations
function removeUser(email) {
  for (i = 0; i < q.length; i++) {
    var entry = q[i];
    if (entry['email'] == email) {
      q.splice(i, 1);
      ids.delete(email)
      io.sockets.emit('deleted', entry['username'], q);
      return
    }
  }
  console.log("Invalid removeUser request with ID: " + email)
}

/*
  Function that removes user from the lasercutter
*/
function finishCutting(c_num) {
  var user;
  if c_num == 1 {
    user = ls_1;
    ls_1 = null;
  } else if c_num == 2 {
    user = ls_2;
    ls_2 = null;
  } else {
    console.log("lasercutter number not valid")
  }
  ids.delete(user['email'])
  pulltoCutter();
  calculateTime();
}


/*
  Function that generates random ID of length 10.
  Currently not Used.
*/
function generateID() {
  var id = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < 10; i++)
    id += possible.charAt(Math.floor(Math.random() * possible.length));

  if (ids.has(id)) {
    return generateID();
  }
  return id;
}

/*
  Function that 'pulls' the next person on the queue to start cutting.
  It checks if the cutter are empty and there exists a person on the queue to pull,
  so the server should call this function WHENEVER the lasercutter is potentially not occupied.

  Parameter: None

  Return type: Javascript Array, [<userid>, <Lasercutter Number>]
*/
function pulltoCutter() {

  if (q.length < 1) {
    console.log("No person on the queue to pull")
    return null;
  }
  var next_person = q[0];
  var user_em = next_person['email'];

  var lc_num = null;
  if (ls_1 == null) {
    lc_num = 1;
    ls_1 = next_person;
  }
  else if (ls_2 == null) {
    lc_num = 2;
    ls_2 = next_person;
  } else {
    console.log("Lasercutters are all occupied")
    return null;
  }

  q.splice(0,1);

  io.sockets.emit('handshake', q) // Send the updated queue.

  setTimeout( function(n) {
    finishCutting(n);
    calculateTime();
    pulltoCutter();
  }, next_person['cut_length']*60*1000, lc_num)

  return [user_em, lc_num]
}

function calculateTime() {
  lasercutter_1 = 0;
  lasercutter_2 = 0;
  for (var i = 0; i < q.length; i++){
    if (i === 0){
      lasercutter_1 += q[i].cut_length;
      ls_1.push(q[i]);
      q[i].time_remaining = lasercutter_1;
    } else if (i === 1) {
      lasercutter_2 += q[i].cut_length;
      ls_2.push(q[i]);
      q[i].time_remaining = lasercutter_2;
    } else {
      if(lasercutter_1 > lasercutter_2) {
        lasercutter_2 += q[i].cut_length;
        ls_2.push(q[i]);
        q[i].time_remaining = lasercutter_2;
      }else{
        lasercutter_1 += q[i].cut_length;
        ls_1.push(q[i]);
        q[i].time_remaining = lasercutter_1;
      }
    }
  }
}

function tickCurrentUsers() {
  if (q.length === 1) {
    if(q[0].time_remaining >= 5){
      q[0].time_remaining -= 5;
      calculateTime();
      socket.emit("handshake",q);
    } else {
      pulltoCutter();
    }
  } else if (q.length >= 2) {
    if(q[0].time_remaining >= 5){
      q[0].time_remaining -= 5;
      calculateTime();
      socket.emit("handshake",q);
    } else {
      pulltoCutter();
    }

    if(q[1].time_remaining >= 5){
      q[1].time_remaining -= 5;
      calculateTime();
      socket.emit("handshake",q);
    } else {
      pulltoCutter();
    }


  }
}
