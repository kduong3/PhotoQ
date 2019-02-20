// global variables
var static = require('node-static');
var http = require('http');
//var fs = require('fs');  // file access
var auto = require("./makeTagTable");

var sqlite3 = require("sqlite3").verbose();
var dbFileName = "PhotoQ.db";
var db = new sqlite3.Database(dbFileName);

var tagTable = {};   // global
auto.makeTagTable(tagTableCallback);
function tagTableCallback(data) {
   tagTable = data;
}

// create a Web server instance
var webServer = http.createServer(handler);

// Create a node-static server instance to serve the './public' folder
var fileServer = new static.Server('./public');

// And start listening for the arrival of http requests
webServer.listen(8080);

// called on http request arrival event
function handler (request, response) {

  // wait for end of request
  request.addListener('end', function () {

  	// is it a query?
  	url = request.url;
  	if (url.indexOf("/query") == 0) {
  	  queryHandler(request,response,url);
  	}

  	// otherwise try to serve a static file
  	else {
  	  fileServer.serve(request, response, function (e, res) {
  	    if (e && (e.status === 404)) { // If the file wasn't found
  		    fileNotFound(request, response);
  	    } //if
  	  } // function
  		); // call to fileServer.serve
  	}

  } // anonymous listener function
		       ).resume(); // addListener for end, keep listening...
}

// what to do when file not found
function fileNotFound (request, response) {
    fileServer.serveFile('/not-found.html', 404, {},request, response);
}

// what to do on a query
function queryHandler (request, response, url) {
    var query = url.substr(6); // position 6 thru end
    var type = query.split("=")[0]; //?keyList
    var params = query.split("=")[1]; //castle+nature%20scene
    console.log(params);
    console.log(type);
    if (type == "?keyList") { handleKeyList(params, response); }
    else if (type == "?addKey") { handleNewKey(params, response); }
    else if (type == "?deleteKey") { handleDelete(params, response); }
    else if (type == "?autocomplete") { handleAutoComp(params, response); }
    else { badQuery(response); }
}

function handleAutoComp( params, response ) {
  var tagToFind = params;
  console.log("letters entered: " + tagToFind);
  var foundTags = tagTable[tagToFind];
  foundTags = JSON.stringify(foundTags);

  if ( foundTags == undefined ){
    console.log("no tags found!");
  }
  else {
    response.writeHead(200, {"Content-Type": "text"});
    response.write(foundTags);
    console.log(foundTags);
    response.end();
  }
}

function handleDelete( params, response ) {
  var keyToDelete = params.split("+")[0];
  var photoId = params.split("+")[1];
  console.log("old Key: " + keyToDelete);
  console.log("photoid: " + photoId);
  //var cmdstr = 'UPDATE photoTags SET listTags= listTags || ", newTag" WHERE idNum = number';
  var cmdstr = 'SELECT listTags FROM photoTags WHERE idNum = number'
  var cmd = cmdstr.replace("number", photoId)
  //cmd = cmd.replace("number", photoId);

  db.all(cmd, gotRowstoDelete);

  function gotRowstoDelete(err, object) {
    //console.log("delete success!");
    console.log(object[0].listTags);
    if (err) {
      console.log("Error getting listTags in database");
    }
    else {
      var newTags = object[0].listTags.split(",");
      for (let i=0; i<newTags.length; i++) {
        if (newTags[i] === keyToDelete) {
          newTags.splice(i, 1);
        }
      }
      //newTags = newTags.replace(keyToDelete+ ",", "");
      console.log(newTags);
      var cmdstr = 'UPDATE photoTags SET listTags= "_newTags" WHERE idNum = number';
      var cmd = cmdstr.replace("_newTags", newTags);
      cmd = cmd.replace("number", photoId);
      db.run(cmd, deleteCallback)
      //response.writeHead(200, {"Content-Type": "text"});
    }

    function deleteCallback(err) {
      console.log("delete success");
      if (err) {
        console.log("Error deleting tag from database");
      }
      else {
        response.writeHead(200, {"Content-Type": "text"});
      }
    }
  }
}

function handleNewKey( params, response ) {
  var newKey = params.split("+")[0];
  var photoId = params.split("+")[1];
  console.log("new Key: " + newKey);
  console.log("photoid: " + photoId);
  var cmdstr = 'UPDATE photoTags SET listTags= listTags || ",newTag" WHERE idNum = number';
  var cmd = cmdstr.replace("newTag", newKey)
  cmd = cmd.replace("number", photoId);

  db.run(cmd, addSuccess);

  function addSuccess(err, object) {
    console.log("success!");
    console.log(object);
    if (err) {
      console.log("Error updating listTags in database");
    }
    else {
      response.writeHead(200, {"Content-Type": "text"});
    }
  }
}

function handleKeyList( params, response ) {
  // check input.  Always important on the server.
    var tags = params.split("+");
    var cleanTags = [];

    for (let i=0; i<tags.length; i++) {
  	  let n = tags[i];
      console.log(tags[i]);
  	  if (/[a-z ]/.test(n)) {
        console.log("cleanTags number " + i + "pushed");
        n = decodeURIComponent(n);
  	    cleanTags.push(n);
  	  }
    }
    console.log(cleanTags);

    if (cleanTags.length != tags.length) {
      console.log("lengths don't match");
  	  badQuery(response);
    }
    else {
    	// get rows from database
    	cmd ='SELECT * from photoTags WHERE '
      // loop to concatenate and build up cmd string
      for (let i=0; i<cleanTags.length; i++) {
    	    cmd = cmd+'(location= "' + cleanTags[i] + '" OR listTags LIKE "%'+cleanTags[i] + '%")';
    	    if (i<cleanTags.length-1) {
    		    cmd = cmd+" AND ";
    	    }
      }
  	  console.log(cmd);
  	  db.all(cmd, gotRowsNowWhat);
    }

  // closure will contain the response object for this request
  function gotRowsNowWhat(err, object) {
    console.log(object.length);
    sendRowsToBrowser(err, object, response);
  }
}

function sendRowsToBrowser(err, object, response) {
  if (err) {
	  console.log("Error getting item list from DB", err);
  }
  else {
    response.writeHead(200, {"Content-Type": "text"});
    if (object.length == 0) {
    	jsonList = JSON.stringify(object);
    	response.write(jsonList);
      //response.write("There were no photos satsifying this query.");
    	response.end();
    }
    else {
      jsonList = JSON.stringify(object);
    	response.write(jsonList);
      //response.write("These are all the photos satsifying this query.");
    	response.end();
    }
  }
}

function badQuery(response) {
    response.writeHead(400, {"Content-Type": "text"});
    response.write("bad query");
    response.end();
}



// read in image list on startup
function loadImageList () {
    data = fs.readFileSync('photoList.json');
    if (! data) {
	    console.log("cannot read photoList.json");
    }
    else {
	    listObj = JSON.parse(data);
	    imgList = listObj.photoURLs;
    }
}
