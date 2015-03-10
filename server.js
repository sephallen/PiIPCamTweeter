var express = require('express')
, app = express()
, http = require('http')
, server = http.createServer(app)
, Twit = require('twit')
, io = require('socket.io').listen(server);
server.listen(4040);

var twitter_consumer_key = '';
var twitter_consumer_secret = '';
var twitter_access_token = '';
var twitter_access_token_secret = ''

// For posting tweets with images because twit doesn't seem to be able to
var Twitter = require('node-twitter');
var twitterRestClient = new Twitter.RestClient(
  twitter_consumer_key,
  twitter_consumer_secret,
  twitter_access_token,
  twitter_access_token_secret
);

// routing
// Tell node to load node-twitter-stream.html when the browser requests /
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/node-twitter-stream.html');
});

// Tell node to serve the CSS file when requested
app.get('/node-twitter-stream.css', function (req, res) {
  res.sendFile(__dirname + '/node-twitter-stream.css');
});

// Tell node to serve the background image when requested
app.get('/selfie-machine.jpg', function (req, res) {
  res.sendFile(__dirname + '/selfie-machine.jpg');
});

// Setting up require for downloading images from ipcam url
var shell = require('shelljs');

// When processing the Twitter firehose, only show Tweets with these keywords
var watchList = ['@tjxmaspi,#tjdevteam,#tjcreative,#tjkitchen,#tjcam4,#tjcam5'];

var T = new Twit({
  consumer_key: '',
  consumer_secret: '',
  access_token: '',
  access_token_secret: ''
});

io.sockets.on('connection', function (socket) {
  var stream = T.stream('statuses/filter', { track: watchList })

  // When a Tweet is recieved:
  stream.on('tweet', function (tweet) {

    var turl = tweet.text;
    var mediaUrl;
    // Does the Tweet have an image attached?
    if ( tweet.entities['media'] ) {
      if ( tweet.entities['media'][0].type == "photo" ) {
        mediaUrl = tweet.entities['media'][0].media_url;
      } else {
        mediaUrl = null;
      }
    }
    // Does the Tweet contain one of the following hashtags?
    var ipcam = turl.match(/#tj/gi);
    if ( ipcam == null ) {
      var random_ipcam = Math.floor((Math.random() * 5) + 1);
      if (random_ipcam == 1) {
        var ipcam_ip = '192.168.11.137';
        var ipcam_team = 'dev team';
        var ipcam_hashtag = '#tjdevteam';
      } else if (random_ipcam == 2) {
        var ipcam_ip = '192.168.11.53';
        var ipcam_team = 'creative';
        var ipcam_hashtag = '#tjcreative';
      } else if (random_ipcam == 3) {
        var ipcam_ip = '192.168.11.131';
        var ipcam_team = 'kitchen';
        var ipcam_hashtag = '#tjkitchen';
      } else if (random_ipcam == 4) {
        var ipcam_ip = '192.168.11.133';
        var ipcam_team = 'camera 4';
        var ipcam_hashtag = '#tjcam4';
      } else {
        var ipcam_ip = '192.168.11.134';
        var ipcam_team = 'camera 5';
        var ipcam_hashtag = '#tjcam5';
      }
      mediaUrl = 'http://'+ipcam_ip+'/videostream.cgi?user=admin&pwd=';
      turl = 'get ready '+ipcam_team+'!';
      shell.exec('wget -O  snapshot.jpg "http://'+ipcam_ip+'/snapshot.cgi?user=admin&pwd=&"');
      setTimeout(function() {
        twitterRestClient.statusesUpdateWithMedia(
          {
            'status': ipcam_hashtag + " @" + tweet.user.screen_name,
            'media[]': 'snapshot.jpg'
          }
        )
        // 5 second wait to take photo
      }, 5000);
    }
    // Send the Tweet to the browser
    io.sockets.emit('stream',turl, tweet.user.screen_name, tweet.user.profile_image_url, mediaUrl);
  });
});
