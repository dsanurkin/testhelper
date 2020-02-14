
const {google} = require('googleapis');
const fs = require('fs')

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

function authorize(credentials, callback) {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);
  
    fs.readFile(TOKEN_PATH, (err, token) => {
      if (err) return getAccessToken(oAuth2Client, callback);
      oAuth2Client.setCredentials(JSON.parse(token));
      callback(oAuth2Client);
    });
}

async function createFolder(parentFolderId, gfolderName) {
    return new Promise((resolve, reject) => {
        fs.readFile('credentials.json', (err, content) => {
            if (err) return console.log('Error loading client secret file:', err);
            authorize(JSON.parse(content), gFolderId);
        });
        function gFolderId(auth) {
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
                console.log('Google Drive folder created!')
                resolve(response.data.id)
            },
            function(err) { 
                console.error("Execute error", err); 
            });
        }
    });
}

async function insertFile(parentFolderId, imgName, imgBody) {
    return new Promise((resolve, reject) => {
        fs.readFile('credentials.json', (err, content) => {
            if (err) return console.log('Error loading client secret file:', err);
            authorize(JSON.parse(content), insertFile);
        });

        function insertFile(auth) {
            const drive = google.drive({version: 'v3', auth});
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
                console.log('Изображение загружено!');
                resolve('https://drive.google.com/uc?id=' + response.data.id);
            },
            function(err) { 
                console.error("Execute error", err); 
                reject(err);
            });
        }
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

    
module.exports.createFolder = createFolder;
module.exports.insertFile = insertFile;
