
const {google} = require('googleapis');
const fs = require('fs')

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// let mainFolderId;
// let childFolderId;


exports.fId = function (parentFolderId, gfolderName, firstCreate) {
    fs.readFile('credentials.json', (err, content) => {
        if (err) return console.log('Error loading client secret file:', err);
        // Authorize a client with credentials, then call the Google Drive API.
        authorize(JSON.parse(content), gFolderId);
    });
    function gFolderId(auth) {
        let returnedFolderId
        console.log("auth", JSON.stringify(auth));
        const drive = google.drive({version: 'v3', auth});
        let folderId = parentFolderId;
        var fileMetadata = {
            'name': gfolderName,
            'mimeType': 'application/vnd.google-apps.folder',
            'parents': [folderId]
        };
        drive.files.create({
            resource: fileMetadata,
            fields: 'id',
        })
        .then(function(response) {
            if (firstCreate === true) {
                returnedFolderId = response.data.id;
                console.log('MAINFOLDER CREATED ' + returnedFolderId)
                
            } else {
                returnedFolderId = response.data.id;
                console.log('CHILDFOLDER CREATED ' + returnedFolderId)
            }
        },
        function(err) { 
            console.error("Execute error", err); 
        });
    }
}


exports.insFile = function (parentFolderId, imgName, imgBody) {
    (function () {
        fs.readFile('credentials.json', (err, content) => {
            if (err) return console.log('Error loading client secret file:', err);
            // Authorize a client with credentials, then call the Google Drive API.
            authorize(JSON.parse(content), insertFile);
        });
    })();
    function insertFile(auth) {
        console.log("auth", JSON.stringify(auth));
        const drive = google.drive({version: 'v3', auth});
        // console.log('parentfolderid = ' + parentFolderId)
        let folderId = parentFolderId;
        var fileMetadata = {
            'name': imgName,
            parents: [folderId]
        };
        var media = {
            mimeType: 'image/jpeg',
            body: fs.createReadStream(imgBody)
        };
        drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id'
        })
        .then(function(response) {
            // Handle the results here (response.result has the parsed body).
            // console.log("Response", response);
            img_urls.push('https://drive.google.com/uc?id=' + response.data.id)
            // console.log('image ID ' + response.data.id);
            // inFolderId = response.data.id;
            // console.log(' THEN INFOLDERID ' + inFolderId)
            // insertFile();
        },
        function(err) { 
          // handle error here.
            console.error("Execute error", err); 
        });
    }
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

    


