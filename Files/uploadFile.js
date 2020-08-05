const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const socket = require('socket.io')
const uploadProcess = require('./app')

const app = express();
app.use(cors({ origin: '*' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static('public'));

const server = app.listen(3000, () => {
  console.log('Started in 3000');
});

const io = socket(server);

io.sockets.on('connection', (socket) => {
  console.log(`************* new connection id: ${socket.id}`);
  uploadProcess(socket);
});

let uploads = {};

app.post('/upload', (req, res, next) => {
  let fileId = req.headers['x-file-id'];
  let name = req.headers['name'];
  let fileSize = parseInt(req.headers['size'], 10);
  let file = req.params
  console.log("file body: ", file)
  console.log('file Size', fileSize, fileId, startByte);
  if (uploads[fileId] && fileSize == uploads[fileId].bytesReceived) {
    res.end();
    return;
  }

  if (!fileId) {
    res.writeHead(400, "No file id");
    res.end(400);
  }
  console.log("uploads fileId: ", uploads[fileId]);
  if (!uploads[fileId])
    uploads[fileId] = {};

  let upload = uploads[fileId];

  let fileStream;

  console.log("****", startByte)
  console.log("====", upload)

  fileStream = fs.createWriteStream(`../name/${name}`, {
    flags: 'w'
  });

  req.on('data', function (data) {
    //console.log("bytes received", upload.bytesReceived);
    upload.bytesReceived += data.length;
  });


  req.pipe(fileStream);

  // when the request is finished, and all its data is written
  fileStream.on('close', function () {
    console.log("=======", upload.bytesReceived, fileSize);
    if (upload.bytesReceived == fileSize) {
      console.log("Upload finished");
      delete uploads[fileId];

      // can do something else with the uploaded file here
      res.send({ 'status': 'uploaded' });
      res.end();
    } else {
      // connection lost, we leave the unfinished file around
      console.log("File unfinished, stopped at " + upload.bytesReceived);
      res.writeHead(500, "Server Error");
      res.end();
    }
  });

  // in case of I/O error - finish the request
  fileStream.on('error', function (err) {
    console.log("fileStream error", err);
    res.writeHead(500, "File error");
    res.end();
  });

});

app.get("/", (req, res) => {
  res.send(
    `<h1 style='text-align: center'>
            Wellcome to FunOfHeuristic 
            <br><br>
            <b style="font-size: 182px;">😃👻</b>
            <button>Click</button>
        </h1>`
  );
});

app.get('/status', (req, res) => {
  //console.log('came');
  let fileId = req.headers['x-file-id'];
  let name = req.headers['name'];
  let fileSize = parseInt(req.headers['size'], 10);
  console.log(name);
  if (name) {
    try {
      let stats = fs.statSync('name/' + name + '.mkv');
      if (stats.isFile()) {
        console.log(`fileSize is ${fileSize} and already uploaded file size ${stats.size}`);
        if (fileSize == stats.size) {
          res.send({ 'status': 'file is present', "uploaded": stats.size })
          return;
        }
        if (!uploads[fileId])
          uploads[fileId] = {}
        console.log(uploads[fileId]);
        uploads[fileId]['bytesReceived'] = stats.size;
        console.log(uploads[fileId], stats.size);
      }
    } catch (er) {

    }

  }
  let upload = uploads[fileId];
  if (upload)
    res.send({ "uploaded": upload.bytesReceived });
  else
    res.send({ "uploaded": 0 });

});