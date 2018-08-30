var http = require('http');
var express = require('express')
var app = express();
var server = http.createServer(app);
var path = require('path');
var http = require('http');
var env = require('dotenv/config');
const nodemailer = require('nodemailer');
const xoauth2 = require('xoauth2');

var io = require('socket.io').listen(server); // WARNING Duplicate?
server.listen(8080, function () {
  console.log("Listening on port 8080")
});

app.use("/", express.static(__dirname));

var io = require('socket.io').listen(server);

//Global variables for the BDW open hours in hh:mm:ss format
var open = "00:00:00";//2pm 14:00:00
var close = "23:59:59";//midnight

var q = [null, null]; // WARNING: imp
var ids = new Map();

var hr = (new Date()).getHours();

var lastTime=0;

// Setting time interval for
var ticking;

// Authentication module.
var auth = require('http-auth');
var basic = auth.basic({
    realm: "IDK.",
    file: path.join(__dirname + '/users.htpasswd')
})

// Setup route. for protected
app.get('/monitor', auth.connect(basic), (req, res) => {
    res.sendFile(path.join(__dirname + '/monitor.html'));
});

function sendEmail(userEmail, laser_number){
  //console.log("Mail sending?...")

  nodemailer.createTestAccount((err, account) => {
      // create reusable transporter object using the default SMTP transport
      let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'bdwautomation@gmail.com',
          pass: 'chrisbull' //process.env.EMAIL_PASSWORD
        }
      });

      // setup email data with unicode symbols
      let mailOptions = {
          from: '"Brown Design Workshop" <bdwautomation@gmail.com>', // sender address
          to: userEmail, // list of receivers
          subject: 'You\'re Next in Line for the Laser Cutter!', // Subject line
          text: 'You are next in line for the BDW laser cutters. Please head over to the design workshop. You will be ' +
          'laser cutter number ' + laser_number + '.', // plain text body
      };

      // send mail with defined transport object
      transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
              return console.log(error);
          }

          else{
            console.log("Message Sent to: " + userEmail);
          }

      });
  });

};

io.sockets.on('connection', function(socket) {
  calculateTime();

  if(!isItOpen()){
    socket.emit('closed');
  }
  else{

  socket.emit('handshake', q, lastTime); // Sends the newly connected client current state of the queue

  socket.on("signin", function() {
    calculateTime();
    socket.emit('handshake', q);
  });

  socket.on('join', function(username, length, pnum, email, should_email) { // Fired by client when it joins the queue

    if (ids.has(email) || !email) return;
    ids.set(email, username);

    var cred = {
      'username': username,
      'id' : socket.id,
      'cut_length' : parseInt(length, 10),
      'phone_number': pnum,
      "time_remaining": parseInt(length, 10),
      'email' : email,
      'should_email' : should_email
    };

    q.push(cred);

    if(q[0] == null && q[1] == null && q.length === 3) { // WARNING queue implementation
      ticking = setInterval(function () {tickCurrentUsers();}, (60000));
    }
    pulltoCutter();

    calculateTime();

    io.sockets.emit('joined', q);
  });

  socket.on('delete-user', function(userEmail) {
    removeUser(userEmail);
  });

}
});

function checkTime(i) {
  if (i < 10) {
    i = "0" + i;
  }
  return i;
}

function getTime(){
  var today = new Date();
  var h = today.getHours();
  var m = today.getMinutes();
  var s = today.getSeconds();

  h = checkTime(h);
  m = checkTime(m);
  s = checkTime(s);
  var time = h + ":" + m + ":" + s;
  return time;
}

function isItOpen(){
  //find out what day of the week it is
  var d = new Date();
  var day = d.getDay();
  var time = getTime();
  var friClose = "20:00:00";//8pm
  if(day==5){//Friday hours
    if(time>=open && time<=friClose){
      return true;
    }
    else{
      return false;
    }
  }
  else{
    //the rest of the hours
    if(time>=open && time<=close){
      return true;
    }
    else{
      return false;
    }
  }
};

app.get('/', function(request, response){
    response.sendFile(path.join(__dirname + '/index.html'));
});

app.get('*', function(request, response){
  response.status(404).send('<h1>Error: 404</h1>');
});

// Function Declarations
function removeUser(email) {
  for (i = 0; i < q.length; i++) { // WARNING
    if (q[i] == null) continue;
    var entry = q[i];
    if (entry['email'] == email) {
      if (i == 0 || i == 1) finishCutting(i);
      else {
        q.splice(i, 1);
        ids.delete(email);
      }
      io.sockets.emit('deleted', entry['username'], q);
      return;
    }
  }
  console.log("Invalid removeUser request with ID: " + email);
}

/*
  Function that removes user from the lasercutter
*/
function finishCutting(c_num) {
  var user;
  if( c_num == 0 ){
    user = q[0];
    q[0] = null;
  } else if (c_num == 1 ){
    user = q[1];
    q[1] = null;
  } else {
    console.log("Lasercutter number not valid")
  }
  ids.delete(user['email']);
  pulltoCutter();
  calculateTime();
}

/*
  Function that 'pulls' the next person on the queue to start cutting.
  It checks if the cutter are empty and there exists a person on the queue to pull,
  so the server should call this function WHENEVER the lasercutter is potentially not occupied.

  Parameter: None

  Return type: Javascript Array, [<userid>, <Lasercutter Number>]
*/
function pulltoCutter() {

  if (q.length < 3) {
    if(q[0] == null && q[1] == null) { // WARNING
      if(ticking != null) {
        console.log("Queues and lasercutters are completely empty. Pausing server.")
        clearInterval(ticking);
      }
    }
    return null;
  }
  var next_person = q[2];
  var user_em = next_person['email'];
  next_person.time_remaining = next_person['cut_length'];

  var lc_num = null;
  if (q[0] == null) {
    lc_num = 0;
    q[0] = next_person;
  }
  else if (q[1] == null) {
    lc_num = 1;
    q[1] = next_person;
  } else {
    console.log("Lasercutters are all occupied")
    return null;
  }

  q.splice(2,1);

  if(next_person['should_email']) {
    sendEmail(user_em, lc_num + 1);
  }


  io.sockets.emit('handshake', q); // Send the updated queue.

  return [user_em, lc_num];
}

function calculateTime() {
  lasercutter_1 = 0;
  lasercutter_2 = 0;

  if (q[0] != null) {
    lasercutter_1 += q[0].time_remaining;
  }
  if (q[1] != null) {
    lasercutter_2 += q[1].time_remaining;
  }

  if(lasercutter_2>lasercutter_1){
    lastTime=lasercutter_1;
  }else{
    lastTime = lasercutter_2;
  }

  for (var i = 2; i < q.length; i++) {
    if (lasercutter_1 > lasercutter_2) {
      q[i].time_remaining = lasercutter_2;
      lasercutter_2 += q[i]['cut_length'];
    } else {
      q[i].time_remaining = lasercutter_1;
      lasercutter_1 += q[i]['cut_length'];
    }
  }

  // if(lasercutter_2>lasercutter_1){
  //   lastTime=lasercutter_1;
  // }else{
  //   lastTime = lasercutter_2;
  // }

  io.sockets.emit("handshake",q);
}

function tickCurrentUsers() {
  // Check first two entries - reserved for cutters

  for (var i = 0; i < 2; i++) {
    // if(i === 0 || i === 1){
    //   q[i].cut_length -= 1;
    // }
    if (q[i] == null) {
      pulltoCutter();
      calculateTime();
    } else{
      if(q[i].time_remaining >= 2){
        q[i].time_remaining -= 1;
        q[i].cut_length -= 1;
        calculateTime();
      } else {
        finishCutting(i);
      }
    }
  }
}
