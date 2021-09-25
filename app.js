const express = require('express'); //Express web server framework
const request = require('request'); //"Request" library
const querystring = require('querystring');  //"Request" library
const https = require('https');
var cookieParser = require('cookie-parser');
var cors = require('cors');
const { json } = require('body-parser');
const { error } = require('console');
const fs = require('fs');
const { restart } = require('nodemon');
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const { post } = require('request');
const { timingSafeEqual } = require('crypto');
const { result } = require('lodash');

let client_id = '54635d60699e4c52b9e9bc6aacdd842f'; // Your client id
let client_secret = '5da9b7f78a404720a9420d7f04415e9c'; // Your secret
let redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri
let userId = ""; //user ID that we get back
let access_token = "";
let refresh_token = "";
let artistPage = false;
let searchResults = [];
let artistInfo = [];
let topTracks = [];

const port = 8888;
const app = express();

var stateKey = 'spotify_auth_state';

app.use(express.static(__dirname + '/public'))
.use(cors())
.use(cookieParser())
.use(bodyParser.urlencoded({extended:true}));

app.set('view engine', 'ejs');

//this function is used in the 'state' parameter of the object used when we are trying to auth for security purposes
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  
  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

//blueprint for searching for a track
function TrackSearch(trackName, artistName, albumName, albumImageUrl, albumUri, trackUri, artistId){ 
  this.trackName = trackName,
  this.artistName = artistName,
  this.albumName = albumName,
  this.albumImageUrl = albumImageUrl,
  this.albumUri = albumUri,
  this.trackUri = trackUri,
  this.artistId = artistId
}

//blueprint for searching for an album
function AlbumSearch(albumName, artistName, albumImageUrl, albumUri, artistId){ 
  this.albumName = albumName,
  this.artistName = artistName,
  this.albumImageUrl = albumImageUrl,
  this.albumUri = albumUri,
  this.artistId = artistId
}

//blueprint for seaching for an artist
// function ArtistSearch(artistName, artistId, artistImageUrl) {
//   this.artistName = artistName,
//   this.artistId = artistId, 
//   this.artistImageUrl = artistImageUrl
// } 
function ArtistSearch(artistName, artistId) {
  this.artistName = artistName,
  this.artistId = artistId
}

function ArtistTopTracks(trackName, albumName){
  this.trackName = trackName, 
  this.albumName = albumName
}

function ArtistDetails(followers, genres, popularity, artistName, image, id){
  this.followers = followers,
  this.genres = genres,
  this.popularity = popularity,
  this.artistName = artistName, 
  this.image = image,
  this.id = id
}

//Here we are requesting authorization from the /authorize route as per the spotify documentation
app.get('/login', function(req, res) {
  
  var state = generateRandomString(16);
  res.cookie(stateKey, state);
  
  // your application requests authorization
  var scope = 'user-read-private user-read-email ugc-image-upload playlist-modify-private playlist-read-private user-read-private user-read-playback-state user-library-modify app-remote-control user-read-recently-played user-modify-playback-state playlist-modify-public user-follow-read playlist-read-collaborative user-library-read streaming user-top-read';
  res.redirect('https://accounts.spotify.com/authorize?' +
  querystring.stringify({
    response_type: 'code', //required, always set to 'code'
    client_id: client_id, //Required, we get an ID when we register with spotify
    scope: scope, //required, what do we need access to? you can find more info here > https://developer.spotify.com/documentation/general/guides/scopes/#user-read-email
    redirect_uri: redirect_uri, //required, uri to redirect to once the user grants or denies permissions
    state: state //optional, but stongly recommended for security reasons
  }));
});

// your application requests refresh and access tokens
// after checking the state parameter
app.get('/callback', function(req, res) {
  
  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;
  
  if (state === null || state !== storedState) {
    res.redirect('/#' +
    querystring.stringify({
      error: 'state_mismatch'
    }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };
    
    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {
        
        access_token = body.access_token,
        refresh_token = body.refresh_token;
        
        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };
        
        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          userId = body.id
        });
        
        // we can also pass the token to the browser to make requests from there
        res.redirect('/#' +
        querystring.stringify({
          access_token: access_token,
          refresh_token: refresh_token
        }));
      } else {
        res.redirect('/#' +
        querystring.stringify({
          error: 'invalid_token'
        }));
      }
    });
  }
});

app.get('/refresh_token', function(req, res) {
  
  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };
  
  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

app.get('/', function(req, res){
  
  searchResults = [];
  artistInfo = [];
  topTracks = [];
  artistPage = false;

  res.render("index", {});
});

app.post("/", function(req, res){ 
  
  const userQueryWithoutProperFormatting = req.body.searchName; //user search entry on the home page
  const userQuery = userQueryWithoutProperFormatting.replace(/\s/g, '+'); //as per spotify documentation
  const searchType = req.body.selectpicker; // track/album/artist
  const arrayOfObjectsFromSpotify = []; //store data that we get back

  console.log("Access Token: " + access_token);
  
  const urlString = "https://api.spotify.com/v1/search?access_token=" + access_token + "&q=" + userQuery + "&type=" + searchType + "&limit=12"; //the search URL

  https.get(urlString, function(response){
    
    if (searchType == "track") { 
      
      response.on("data", function(chunk){ 
        
        arrayOfObjectsFromSpotify.push(chunk);
      })
      
      response.on('end', function(){
        const data = Buffer.concat(arrayOfObjectsFromSpotify);
        var trackData = JSON.parse(data)
        
        //loop through the object, for each does not work when looping through an object. 
        for (let i=0; i < trackData.tracks.items.length; i++){
          
          const trackName = trackData.tracks.items[i].name
          const artistName = trackData.tracks.items[i].album.artists[0].name;
          const albumName = trackData.tracks.items[i].album.name;
          const albumImageUrl = trackData.tracks.items[i].album.images[0].url;
          const artistId = trackData.tracks.items[i].artists[0].id;
          
          const albumUriPath = trackData.tracks.items[i].album.uri;
          const albumUri = albumUriPath.substring(14);
          const trackUriPath = trackData.tracks.items[i].uri;
          const trackUri = trackUriPath.substring(14);
          
          let result = new TrackSearch(trackName, artistName, albumName, albumImageUrl, albumUri, trackUri, artistId)
          searchResults.push(result);
        }
        
        res.render("result", 
        {
          searchResults:searchResults, artistPage:artistPage
        })
      });
    }
    
    else if (searchType == "album") {
      
      response.on("data", function(chunk){   
        arrayOfObjectsFromSpotify.push(chunk);
      });
      
      response.on('end', function(){
        const data = Buffer.concat(arrayOfObjectsFromSpotify);
        var albumData = JSON.parse(data)
        //console.log(albumData.albums.items);
        
        for (let i=0; i < albumData.albums.items.length; i++){
          
          const albumName = albumData.albums.items[0].name;
          const artistName = albumData.albums.items[i].artists[0].name;
          const albumImageUrl = albumData.albums.items[i].images[0].url;
          const artistId = albumData.albums.items[i].artists[0].id;

          const albumUriPath = albumData.albums.items[0].uri;
          const albumUri = albumUriPath.substring(14);
          
          console.log("Album URI : " + albumUri);

          let result = new AlbumSearch(albumName, artistName, albumImageUrl, albumUri, artistId)
          searchResults.push(result);
          console.log(userQuery);
        }
        
        res.render("result", 
        {
          searchResults:searchResults, artistPage:artistPage
        })
        
      });
    }
    
    else if (searchType == "artist"){ 
      
      artistPage = true;
      
      response.on("data",function(chunk){ 
        arrayOfObjectsFromSpotify.push(chunk)
      })
      
      response.on("end",function(){
        const data = Buffer.concat(arrayOfObjectsFromSpotify);
        var artistData = JSON.parse(data);
        //console.log(artistData)
        for (var i = 0; i < artistData.artists.items.length; i++) {
          
          const artistName = artistData.artists.items[i].name
          const artistId = artistData.artists.items[i].id
          const artistImageUrl = artistData.artists.items[i].images //! Not working for some reason, cannot get ahold of the URL proerty.
          
          
          //let result = new ArtistSearch(artistName, artistId, artistImageUrl)
          let result = new ArtistSearch(artistName, artistId)
          searchResults.push(result);
        }
        
        res.render("result",{searchResults:searchResults, artistPage:artistPage});
      })
    }
  });
  
});

app.get('/album/:uri', function(req, res){ 
  
  const requestedUri = req.params.uri;
  
  console.log(searchResults);
  console.log("requested URI = " + requestedUri);
  
  for (var i = 0; i < searchResults.length; i++){
    console.log(searchResults[i].albumUri)
    if (requestedUri == searchResults[i].albumUri){
      res.render('play', {searchResults:searchResults, i:i})
    }
  }
  
});

app.get('/artist/:id', function(req, res){
  //we get the ID of the artist, but we will need to render another "artist page"
  //after we render the page, make another post request for the artists top songs
  let artistName;
  let albumName;
  let image;
  let followers;
  let genres;
  let popularity;
  let trackName;
  let id;
  
  const requestedId = req.params.id
  console.log("requested ID = " + requestedId);
  const topTrackUrl = "https://api.spotify.com/v1/artists/" + requestedId + "/top-tracks?market=MA&access_token=" + access_token
  const topTrackData = [];
  
  const artistDetailsUrl = "https://api.spotify.com/v1/artists/" + requestedId + "?access_token=" + access_token
  const artistData = [];
  //probably need to render after we do the next get request
  //res.render("artist", {searchResults:searchResults})
  
  https.get(artistDetailsUrl, function(response){
    
    response.on('data', function(chunk){
      artistData.push(chunk)
    })
    response.on('end', function(){
      
      const dataBack = JSON.parse(Buffer.concat(artistData));
      
      artistName = dataBack.name;
      followers = dataBack.followers.total;
      genres = dataBack.genres;
      popularity = dataBack.popularity;
      image = dataBack.images[0];
      id = dataBack.id;
      
      let artistDetails = new ArtistDetails(followers, genres, popularity, artistName, image, id);
      artistInfo.push(artistDetails);
      
      https.get(topTrackUrl, function(response){
        response.on('data', function(chunk){
          topTrackData.push(chunk)
        })
        response.on('end', function(){
          const dataBack = JSON.parse(Buffer.concat(topTrackData));
          console.log("requested ID 2 = " + requestedId)
          
          for (var i = 0; i<dataBack.tracks.length; i++){ 
            trackName = dataBack.tracks[i].name;
            albumName = dataBack.tracks[i].album.name;
      
            let artistTopTracks = new ArtistTopTracks (trackName, albumName);
            topTracks.push(artistTopTracks);
          }

          for (var index = 0; index < artistInfo.length; index++){
            if (requestedId == artistInfo[index].id){
              res.render('artist', {artistInfo:artistInfo, topTracks:topTracks, index:index})
            }
         }
        })
      })
    })
  })
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}/login`)
});