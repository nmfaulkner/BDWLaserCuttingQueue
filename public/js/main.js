//global variables
var userId = -1;
var username;
var userEmail;
var socket = io.connect();
var should_email = false;

function onSignIn(googleUser) {
  var profile = googleUser.getBasicProfile();
  username = profile.getName();
  userEmail = profile.getEmail();
  var signInButton = document.getElementById("sign-in");
  signInButton.classList.add("hidden");
  var signOutButton = document.getElementsByClassName("sign-out-container")[0];
  signOutButton.classList.remove("hidden");
  var joinQueueButton = document.getElementById("join-queue-form");
  joinQueueButton.classList.remove("hidden");
  //becuase race conditions between socket adnd signin to mark our curr user correctly
  socket.emit("signin");
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
          if(queue[i].userEmail != userEmail) {
            timeRemaining = parseInt(queue[i].time_remaining);
          } else {
            break;
          }
      }

      }

      updateTimer(timeRemaining);
      renderQ(queue);
    });

    socket.on('closed', function(){
      $('.header-buttons-container').html("");
      $('.body-content').html('<div id="closed"><p>Come back when the BDW is open to join the lasercutter queue. </br><a href="https://www.brown.edu/research/projects/design-workshop/calendar">BDW Calendar</a></p></div>');
    });

    // Server emits this whenever new client connects

    socket.on("joined", function(queue) {
      //first element in list is current user on laser1
      //second element in list is current user on laser2

      //make ticking timer with total time in list
      var timeRemaining = 0;

      for(var i = 0; i < queue.length; i++) {
        if(queue[i] != null){
          if(queue[i].email != userEmail) {
            timeRemaining = parseInt(queue[i].time_remaining);
          } else {
            break;
          }
        }
      }

      updateTimer(timeRemaining);
      //print rest of list
      //mark our current user in the list
      renderQ(queue);


    });


    socket.on('deleted', function(username, queue) {
      var timeRemaining = 0;

      for(var i = 0; i < queue.length; i++) {
        if(queue[i] != null){
          if(queue[i].email != userEmail) {
            timeRemaining = parseInt(queue[i].time_remaining);
          } else {
            break;
          }
      }
      }

      updateTimer(timeRemaining);

      renderQ(queue);
    });

    //on reconnection after disconnection server need to send updated queue

  function sendNewQueueUser(username,length, phone_number, email) {
    socket.emit("join", username, length, phone_number, email);
  };




  /*******************************************************************/
  /******************** HTML/Webpage Interactions  *******************/
  /*******************************************************************/

  /* Header Scroll Motion Interaction */

  /* ---------------------------------------------------*/

  /* Join Queue Form Appear Interaction */
  $("#join-queue-button").click(function() {
    $(".home-content").removeClass("stack-behind");
     $("#join-queue-form-page").removeClass("hidden");
  });

  // $("#monitor-button-form").click(function(){
  //   $(".home-content").removeClass("stack-behind");
  //    $("#monitor-password-form-page").removeClass("hidden");
  // });

  /* Join Queue Form Disappear */
  //When outside the form is clicked
  $(".form-background").click(function() {
     formDisappear();
  });
  //When the "X" button is clicked
  $("#form-exit-button").click(function() {
    formDisappear();
  });

  $('body').on('click', "#delete-queue-button",function () {
    $(".join-queue-form").removeClass("hidden");
    $(".youre-up-container").css("display", "none");
    $(".time-background-block").css("background-color","#1c75bc");
    socket.emit('delete-user', userEmail);
  });


/* ---------------------------------------------------*/

  /* Hidden Messages Hover Interactions */

  // Monitor Sign in Message Hover
  $("#bdw-logo").hover(function () {
    $("#bdw-logo-hidden-message").removeClass("hidden");
    $(document).bind('mousemove', function(e){
      $('#bdw-logo-hidden-message').css({
         left:  e.pageX - 40,
         top:   e.pageY - 30
      });
    });
  }, function () {
    $(document).unbind();
    $("#bdw-logo-hidden-message").addClass("hidden");
  });

  //Timer Message Hover
  $(".time-background-block").hover(function () {
    var hiddenMessage = $("#timer-brown-hidden-message");
    hiddenMessage.removeClass("hidden");
    $(document).bind('mousemove', function(e){
      hiddenMessage.css({
         left:  e.pageX - 100,
         top:   e.pageY - 40
      });
    });

  }, function () {
    $(document).unbind();
    var hiddenMessage = $("#timer-brown-hidden-message");
    hiddenMessage.addClass("hidden");
  });


  /* --------------------------------------------------- */

  /* Join Queue Form Submission */


  //bind submitForm function to join queue form click
  $("#form-submit-button").click(submitForm);

  //Adds user to the queue
  function submitForm () {

    //check that necessary parts of form are filled in
    var validForm = false;

    var selectedTime = $("select option:selected").val();
    var selectTimeDefault = "Select Approx Time";

    if (selectedTime !== selectTimeDefault) {
        //form is valid
        validForm = true;

        //add our user to the queue
        //addToQueue(username, selectedTime,"user");

    }

    if(!validForm) {
      //show necessary false stuff
    } else{

      //run notification functions

      //close form
      formDisappear();

      //delete join queue button
      $(".join-queue-form").addClass("hidden");

      //send info to server
      sendNewQueueUser(username, parseInt((selectedTime).slice(0,2).replace(/\s/,"")), null, userEmail);

    }

  }

  /* --------------------------------------------------- */

  /* Sign Out Interaction */

  $("#sign-out").click(function() {
    $(".join-queue-form").removeClass("hidden");
    // socket.emit('delete-user', userEmail);
    signOut();

  });


  function signOut() {
    var auth2 = gapi.auth2.getAuthInstance();
    auth2.signOut().then(function () {
    });

    var signInButton = document.getElementById("sign-in");
    signInButton.classList.remove("hidden");
    var signOutButton = document.getElementsByClassName("sign-out-container")[0];
    signOutButton.classList.add("hidden");
    var joinQueueButton = document.getElementById("join-queue-form");
    joinQueueButton.classList.add("hidden");

  }

  /* --------------------------------------------------- */

  /* Phone Checkbox Form Interaction */
  //phone number checkbox clicked
  $("#email-notification-checkbox input").click(function () {
    should_email = true;
  });

  /* --------------------------------------------------- */

  /* Webpage Interaction Util Functions */

  function renderQ(queue) {
    var timeRemaining = 0;
    $(".youre-up-container").css("display", "none");
    $(".time-background-block").css("background-color","#1c75bc");

      while ($(".queue-table")[0].hasChildNodes()) {
        $(".queue-table")[0].removeChild($(".queue-table")[0].lastChild);
      }

        for(var i = 0; i < queue.length; i++) {
          if(queue[i] != null){
            if(queue[i].email === userEmail) {
              changeTimer(queue[i].time_remaining);
              $(".join-queue-form").addClass("hidden");
              if(i === 0||i === 1) {
                //add youre up
                $(".youre-up-container").css("display","flex");
                $(".time-background-block").css("background-color","red");
                if(should_email === true){
                  socket.emit("up-next", userEmail);
                }
                addToQueue(i+1, queue[i].username,queue[i].time_remaining,"user");
              } else {
                  addToQueue(i+1, queue[i].username,queue[i].cut_length,"user");
              }

            } else {
              if(i === 0 || i === 1) {
                addToQueue(i+1, queue[i].username,queue[i].cut_length,"non-user");
              } else {
                addToQueue(i+1, queue[i].username,queue[i].cut_length,"non-user");
              }

            }
        }
        }



  }

  function addToQueue(num, name,cutLength, flag) {
    var newQueueElem;
    if(flag === "user") {
      newQueueElem = "<tr class='queue-elem-container selected'>"+
                            "<td class='queue-elem'>"+ num +"</td>"+
                            "<td class='queue-elem'>"+name+"</td>"+
                            "<td class='queue-elem'>"+cutLength+" mins"+"</td>"+
                            "<td class='queue-elem delete-queue-elem'>"+
              									"<input class='bdw-button delete-button' id='delete-queue-button' value='Delete' type='button'>"+
              							"</td>"+
                        "</tr>";

    } else if (flag === "non-user") {
      newQueueElem = "<tr class='queue-elem-container'>"+
                            "<td class='queue-elem'>"+num +"</td>"+
                            "<td class='queue-elem'>"+name+"</td>"+
                            "<td class='queue-elem'>"+cutLength+" mins"+"</td>"+
                            "<td class='queue-elem'></td>"+
                        "</tr>";
    }

    $(".queue-table").append(newQueueElem);
  }

  function formDisappear() {
    $(".home-content").addClass("stack-behind");
    $("#join-queue-form-page").addClass("hidden");
    $("#monitor-password-form-page").addClass("hidden");
  }

/* --------------------------------------------------- */



/*******************************************/
/*         Client Time Logic              */
/******************************************/







var ticking = null;
var currHour = 0;
var currMin = 0;


updateTimer(0);
//each queue element has the following attributes
// userid
//time
//length
//phone number
//email

// updates the current time on the timer
//timeRemaining : time remaining until user can sign up
function updateTimer(timeRemaining) {
  //change the current timer time remaining to new timeRemaining
  changeTimer(timeRemaining);

}

function changeTimer(newTime) {
  var timer = $(".timer-time")[0];
  var minutes = 0;
  var hours = 0;
  //newTime is in minutes
  //find out if hours units are required
  if(newTime >= 60) {
    hours = Math.floor(newTime / 60);
    minutes = newTime - (hours * 60);

  } else {
    minutes = newTime;
  }

  //print out new timer
  printTimer(hours,minutes);

  //set global variables
  currMin = minutes;
  currHour = hours;




}


function printTimer(hours, minutes) {
  var timer = $(".timer-time");
  //remove current time
  while (timer[0].hasChildNodes()) {
    timer[0].removeChild(timer[0].lastChild);
  }

  var hourUnits = "";
  var minuteUnits = "";

  if(minutes > 1) {
    minuteUnits = " mins";
  } else {
    minuteUnits = " min";
  }

  if (hours > 0) {

    if(hours > 1) {
      hourUnits  = " hrs";
    } else {
      hourUnits = " hr";
    }
    var printHours = "<div class='timer-time-hours'>" + hours + hourUnits + "</div>";

    if (minutes > 0) {
      var printMinutes = "<div class='timer-time-hours'>" + minutes + minuteUnits + "</div>";
    }

    timer.append(printHours);
    timer.append(printMinutes);

  } else {

    var printMinutes = "<div class='timer-time-hours'>" + minutes + " mins" + "</div>";
    timer.append(printMinutes);

  }
}


//make timeremaingin function
//make lasercutter assignment fucntion
//every client is updated with who currently at the


});
