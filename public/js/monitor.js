//global variables
var userId = -1;
var username;
var userEmail;
var socket = io.connect();
var should_email = false;

function deleteUser(email){
  socket.emit('delete-user', email);
}

$(document).ready(() => {



  /*******************************************************************/
  /************************** Socket Functions  **********************/
  /*******************************************************************/

    // Server emits this on connection to give initial state of the queue
    socket.on('handshake', function(queue) {
      var timeRemaining = 0;

      for(var i = 0; i < queue.length; i++) {
        if(queue[i] != null){
          console.log(queue[i]);
          if(queue[i].userEmail != userEmail) {
            timeRemaining += parseInt(queue[i].cut_length);
          } else {
            break;
          }
      }

      }

    //  updateTimer(timeRemaining);
      renderQ(queue);
    });

    socket.on('closed', function(){
      $('.header-buttons-container').html("");
      $('.body-content').html('<div id="closed"><p>Come back when the BDW is open to join the lasercutter queue. </br><a href="https://www.brown.edu/research/projects/design-workshop/calendar">BDW Calendar</a></p></div>');
    });

    // Server emits this whenever new client connects

    socket.on("joined", function(queue) {
      console.log("QUEUE: " + queue);
      //first element in list is current user on laser1
      //second element in list is current user on laser2

      //make ticking timer with total time in list
      var timeRemaining = 0;

      for(var i = 0; i < queue.length; i++) {
        if(queue[i] != null){
          if(queue[i].userid != userId) {
            timeRemaining += parseInt(queue[i].cut_length);
          } else {
            break;
          }
      }
      }

      //updateTimer(timeRemaining);
      //print rest of list
      //mark our current user in the list
      renderQ(queue);


    });


    socket.on('deleted', function(username, queue) {
      var timeRemaining = 0;

      for(var i = 0; i < queue.length; i++) {
        if(queue[i] != null){
          if(queue[i].userid != userId) {
            timeRemaining += parseInt(queue[i].cut_length);
          } else {
            break;
          }
      }
      }

      //updateTimer(timeRemaining);

      renderQ(queue);
    });

    //on reconnection after disconnection server need to send updated queue

  function sendNewQueueUser(username,length, phone_number, email) {
    socket.emit("join", username, length, phone_number, email);
  };

  /* Webpage Interaction Util Functions */

  function renderQ(queue) {
    var timeRemaining = 0;

      while ($(".queue-table")[0].hasChildNodes()) {
        $(".queue-table")[0].removeChild($(".queue-table")[0].lastChild);
      }

        for(var i = 0; i < queue.length; i++) {
          if(queue[i] != null){
          //  if(queue[i].email === userEmail) {
              //changeTimer(queue[i].time_remaining);
              $(".join-queue-form").addClass("hidden");
              if(i === 0||i === 1) {
                //add youre up
                $(".youre-up-title").removeClass("hidden");
                if(should_email === true){
                  socket.emit("up-next", userEmail);
                }
              }

              addToQueue(i+1, queue[i].username,  queue[i].email, queue[i].cut_length, "user");
          //  }
            // else {
            //   addToQueue(i+1, queue[i].username, queue[i].cut_length, queue[i].email, "non-user");
            // }
        }
        }
  }



  function addToQueue(num, name, email, cutLength, flag) {
    var newQueueElem;
    var newemail = "&#39;" + email + "&#39;";
      newQueueElem = "<tr class='queue-elem-container selected'>"+
                            "<td class='queue-elem'>"+ num +"</td>"+
                            "<td class='queue-elem'>"+name+"</td>"+
                            "<td class='queue-elem'>"+cutLength+"</td>"+
                            "<td class='queue-elem delete-queue-elem'>"+
              									"<input class='bdw-button delete-button' id='delete-queue-button' value='Delete' type='button' onclick='deleteUser("+newemail+")'/>"+
              							"</td>"+
                        "</tr>";

    $(".queue-table").append(newQueueElem);
  }

  function formDisappear() {
    $(".home-content").addClass("stack-behind");
    $("#join-queue-form-page").addClass("hidden");
    $("#monitor-password-form-page").addClass("hidden");
  }


function printEmptyQueuePage() {
  console.log("TBD");
}

});
