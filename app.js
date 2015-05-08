
var fs = require('fs');
var express = require('express');
var app = express();

app.set('port', (process.env.PORT || 3001));
app.use(express.static(__dirname)); //use static files in ROOT folder

// Serve the compiled image directory of etelementscss
app.use('/img', express.static(__dirname + '/bower_components/etelementscss/dist/img'));
// Serve the compiled image directory under /img.
app.use('/img', express.static(__dirname + '/dist/img'));

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

module.exports = app;
