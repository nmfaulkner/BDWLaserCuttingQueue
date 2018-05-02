//global variables

var userId = -1;
var username;
var userEmail;


function onSignIn(googleUser) {
  var profile = googleUser.getBasicProfile();
  console.log('ID: ' + profile.getId()); // Do not send to your backend! Use an ID token instead.
  username = profile.getName();
  userEmail = profile.getEmail();
  console.log('Name: ' + profile.getName());
  console.log('Image URL: ' + profile.getImageUrl());
  console.log('Email: ' + profile.getEmail()); // This is null if the 'email' scope is not present.
  // document.getElementById('user').innerHTML = profile.getEmail();
  // document.getElementByID('user').innerHTML = profile.getEmail();
  var signInButton = document.getElementById("sign-in");
  signInButton.classList.add("hidden");
  var signOutButton = document.getElementById("sign-out");
  signOutButton.classList.remove("hidden");
  var joinQueueButton = document.getElementById("join-queue-form");
  joinQueueButton.classList.remove("hidden");
}

$(document).ready(() => {

  var socket = io.connect();

  /*******************************************************************/
  /************************** Socket Functions  **********************/
  /*******************************************************************/

    // Server emits this on connection to give initial state of the queue
    socket.on('handshake', function(queue) {
      renderQ(queue);
    });

    // Server emits this whenever new client connects

    socket.on("joined", function(queue) {
      //first element in list is current user on laser1
      //second element in list is current user on laser2

      //make ticking timer with total time in list
      var timeRemaining = 0;

      for(var i = 0; i < queue.length; i++) {
        if(queue[i].userid != userId) {
          timeRemaining += queue[i].cut_length;
        } else {
          break;
        }

      }

      updateTimer(timeRemaining);

      //print rest of list
      //mark our current user in the list


    });

    socket.on('deleted', function(username, queue) {
      renderQ(queue);
      if (username == getMeta('username')) {
          //TODO This client has been removed from queue.
      }
    });



  /*******************************************************************/
  /******************** HTML/Webpage Interactions  *******************/
  /*******************************************************************/

  /* Header Scroll Motion Interaction */
  var headerHeight = $("header").height();
  $(document).on("scroll",function() {
    if ($(document).scrollTop() > headerHeight) {
      $("header").addClass("header-scroll");
    } else {
      $("header").removeClass("header-scroll");
    }
  });

  /* ---------------------------------------------------*/

  /* Join Queue Form Appear Interaction */
  $("#join-queue-button").click(function() {
    $(".home-content").removeClass("stack-behind");
     $(".form-page").removeClass("hidden");
  });



  /* Join Queue Form Disappear */
  //When outside the form is clicked
  $(".form-background").click(function() {
     formDisappear();
  });
  //When the "X" button is clicked
  $("#form-exit-button").click(function() {
    formDisappear();
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
        addToQueue(username, selectedTime,"user");

    }

    if(!validForm) {
      //show necessary false stuff
      console.log("Please select approx time of cut.");
    } else{

      //run notification functions

      //close form
      formDisappear();

      //delete join queue button
      while ($(".header-buttons-container")[0].hasChildNodes()) {
        $(".header-buttons-container")[0].removeChild($(".header-buttons-container")[0].lastChild);
      }

      //delete form
      while ($(".form-page")[0].hasChildNodes()) {
        $(".form-page")[0].removeChild($(".form-page")[0].lastChild);
      }
    }

  }

  /* --------------------------------------------------- */

  /* Sign Out Interaction */

  $("#sign-out").click(function() {
    signOut();
  });


  function signOut() {
    var auth2 = gapi.auth2.getAuthInstance();
    auth2.signOut().then(function () {
    console.log('User signed out.');
    });
    // document.getElementById('user').innerHTML = " ";
    var signInButton = document.getElementById("sign-in");
    signInButton.classList.remove("hidden");
    var signOutButton = document.getElementById("sign-out");
    signOutButton.classList.add("hidden");
    var joinQueueButton = document.getElementById("join-queue-form");
    joinQueueButton.classList.add("hidden");
  }

  /* --------------------------------------------------- */

  /* Phone Checkbox Form Interaction */
  //phone number checkbox clicked
  $("#phone-notification-checkbox input").click(function () {
    //make phone number appear if checked
    //make disappear if unchecked
    if($("#phone-notification-checkbox input")[0].checked) {
      $(".phone-number-module").removeClass("hidden");
      $(".form-content-box").css("height", "400px");
    } else {
      $(".phone-number-module").addClass("hidden");
      $(".form-content-box").css("height", "320px");
    }
  });

  /* --------------------------------------------------- */

  /* Webpage Interaction Util Functions */

  //TODO This is a function that will take care of rendering the new state of the queue
  function renderQ(queue) {
    var thisname = getMeta('username');

    addToQueue(queue[0].username,queue[0].cut_length,"currently-using");
    addToQueue(queue[1].username,queue[1].cut_length,"currently-using");

    for(var i = 2; i < queue.length; i++) {
      if(queue[i].userid == userid) {
        addToQueue(queue[i].username,queue[i].cut_length,"user");
      } else {
        addToQueue(queue[i].username,queue[i].cut_length,"non-user");
      }
    }

  }

  function addToQueue(name,cutLength, flag) {
    var newQueueElem;
    if(flag === "user") {
      newQueueElem = "<tr class='queue-elem-container selected'>"+
                            "<td class='queue-elem'>"+name+"</td>"+
                            "<td class='queue-elem'>"+cutLength+"</td>"+
                        "</tr>";

    } else if (flag === "non-user") {
      newQueueElem = "<tr class='queue-elem-container'>"+
                            "<td class='queue-elem'>"+name+"</td>"+
                            "<td class='queue-elem'>"+cutLength+"</td>"+
                        "</tr>";
    }else if(flag == "currently-using") {
      //tbd
    }

    $(".queue-table").append(newQueueElem);
  }

  function validateEmail(email) {
    //placeholder Function
    return (email != "")


  }

  function getMeta(name) {
    var tag = document.querySelector('meta[name=' + name + ']');
    if (tag != null)
      return tag.content;
    return '';
  }

  function formDisappear() {
    $(".home-content").addClass("stack-behind");
    $(".form-page").addClass("hidden");
  }

/* --------------------------------------------------- */






















/*******************************************/
/*         Client Time Logic              */
/******************************************/







var ticking = null;
var currHour = 0;
var currMin = 0;


changeTimer(100);
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
  //stop old timer
  stopTickingTimer();


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

  //start ticking timer
  ticking = setInterval(function () {tickingTimer();}, 60000);



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

function tickingTimer() {

  if(currMin > 0) {
    currMin--;
  } else if (currHour > 0) {
    currHour--;
    currMin = 59;
  } else {
    stopTickingTimer();
    printEmptyQueuePage();
    return;
  }


  printTimer(currHour, currMin);
}

function stopTickingTimer() {
  if(ticking != null) {
    clearInterval(ticking);
  }
}

function printEmptyQueuePage() {
  console.log("TBD");
}


//make timeremaingin function
//make lasercutter assignment fucntion
//every client is updated with who currently at the


});
