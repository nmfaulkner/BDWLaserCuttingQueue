var express = require('express');
var app = express();
var path = require('path');

var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());

var engines = require('consolidate');
app.engine('html', engines.hogan); // tell Express to run .html files through Hogan
app.set('views', __dirname + '/templates'); // tell Express where to find templates, in this case the '/templates' directory
app.set('view engine', 'html'); //register .html extension as template engine so we can render .html pages


app.get('/', function(request, response){
  response.sendFile(path.join(__dirname + '/index.html'));
});

app.post("/joinqueue", function(request, response){
  response.render('index.html', {form:true})
});



app.listen(8080, function(){
  console.log("Listening on Port 8080");
});
