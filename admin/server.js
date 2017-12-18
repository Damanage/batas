'use strict';

require("console-stamp")(console, {
    pattern:"dd.mm.yyyy HH:MM:ss.l",
    metadata:'[' + process.pid + ']',
});

const conf = require('../config.json');

var express = require('express');

var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false });
var jsonParser = bodyParser.json();

var multer  = require('multer');
var storage = multer.memoryStorage();
var upload = multer({ storage: storage });

var app = express();

app.use(cookieParser());
app.use('/', express.static(__dirname + '/client'));
app.use('/login', express.static(__dirname + '/client/login.html'));

app.post('/login', urlencodedParser, function(req, res, next) {
    if (req.body && req.body.pwd) {
      var crypto = require('crypto');
      var hash = crypto.createHash('sha512').update(req.body.pwd).digest('hex');
      if (hash == conf.APItoken.hash) {
        res.cookie('APIToken' , hash).redirect('/');
      }
      else {
        res.redirect('/login');
      }
    } else {
      res.redirect('/login');
    }
});

app.use('/api', function(req, res, next){
  if (req.cookies.APIToken == conf.APItoken.hash) {
    next();
  }
  else {
    res.status(403).send({
      success: false,
      message: 'No token provided.'
    });
  }
});

function getPubData () {
  return new Promise (function (resolve, reject) {
    var pub = require('nano')('https://' + conf.db.batas_public.rkey +'@' + conf.db.url + "/batas_public");
    pub.view('show', 'battery', function(err, body, cb) {
      if (!err) {
        var data = [];
        try {
          body.rows.forEach(function(doc) {
            data.push({
              "id": doc.id,
              "rev": doc.value._rev,
              "type": doc.value.type,
              "status": doc.value.properties.status,
              "product": doc.value.properties.product,
              "price": doc.value.properties.price,
              "currency": doc.value.properties.currency,
              "comments": doc.value.properties.comments,
              "fromdate": doc.value.properties.fromdate,
              "geo": doc.value.geometry.coordinates
            });
          });
          resolve (data);
        } catch (e) {
            reject ("Error database replay: " + e);
          }
      }
      else {
        reject ("Cann't get public data: " + err);
      }
    });
  });
}

function getPrvData () {
  return new Promise (function (resolve, reject){
    var prv = require('nano')('https://' + conf.db.batas_private.rkey +'@' + conf.db.url + "/batas_private");
    prv.view('show', 'desc', function(err, body, cb) {
      if (!err) {
        var data = [];
        try {
          body.rows.forEach(function(doc) {
            
            var links = [];
            
            for (var filename in doc.value._attachments) {
              links.push(filename);
            }
            
            data.push({
              "id": doc.id,
              "rev": doc.value._rev,
              "type": doc.value.type,
              "desc": doc.value.desc,
              "notes": doc.value.notes,
              "links": links
            });
            

          });
          resolve (data);
        } catch (e) {
            reject ("Error database replay: " + e);
          }
      }
      else {
        reject ("Cann't get public data: " + err);
      }
    });
  });
};

function getAllData () {
  return new Promise (function (resolve, reject) {
   Promise.all ([
      getPubData(),
      getPrvData()
    ])
    .then(
      function (r) {
        var data = [];
        
        var pub = r[0];
        var prv = r[1];
        
        for (var b in pub) {
          for (var v in prv) {
            if (pub[b].id == prv[v].id) {
              data.push({
                "pub": pub[b], 
                "prv": prv[v]
              });
              break;
            }
          }
        };
        resolve ({"data": data});
      }
    )
    .catch(
      function (e) {
        reject(e);
      }
    );
  });
};

app.get('/api/pub', function (req, res) {
 getPubData()
 .then(
    function (d) {
      res.send(d);
    },
    function (e) {
      console.error(e);
      res.status(403).send({
        success: false,
        message: e
      });
    }
  );
});

app.get('/api/prv', function (req, res) {
 getPrvData()
 .then(
    function (d) {
      res.send(d);
    },
    function (e) {
      console.error(e);
      res.status(403).send({
        success: false,
        message: e
      });
    }
  );
});

app.get('/api/all', function (req, res) {
  getAllData()
  .then(
    function (d) {
      res.send(d);
    }, 
    function (e) {
      console.error(e);
      res.status(403).send({
        success: false,
        message: e
      });
    }
  );
});

function savePubData(data) {
  return new Promise (function (resolve, reject){
    var pub = require('nano')('https://' + conf.db.batas_public.wkey +'@' + conf.db.url + "/batas_public");
    pub.insert(data, function (err, body) {
      if (!err) {
        resolve (body);
      }
      else {
        reject (err);
      }
    });
    
  });
}

app.post('/api/save', jsonParser, function (req, res) {
  //console.info(req.body);
  savePubData(req.body.pub)
  .then (
    function (body){
      res.send(body);
    },
    function (e) {
      console.error(e);
      res.status(403).send({
        success: false,
        message: e
      });
    }
  );
  
});

app.post('/api/upload', upload.array('files'), function (req, res, next) {
  // req.files is array of `files` files 
  // req.body will contain the text fields, if there were any 
  
  //console.log(req);
  
  if (req.files.length) {
    var pubdata = JSON.parse(req.body.pub);
    
    var pub = require('nano')('https://' + conf.db.batas_public.wkey +'@' + conf.db.url + "/batas_public");
    
    var r = {
      success: true,
      message: {
        pub: {},
        prv: {}
      }
    };
    
    pub.insert(pubdata, function (err, body) {
      if (!err) {
        //console.info(body);
        r.message.pub = body;
    
        var files = [];
    
        for (var f in req.files) {
          files.push({name: req.files[f].originalname, data: req.files[f].buffer, content_type: req.files[f].mimetype});
        }
     
        var prvdata = JSON.parse(req.body.prv);
        var prv = require('nano')('https://' + conf.db.batas_private.wkey +'@' + conf.db.url + "/batas_private");    
        
        prvdata._id = r.message.pub.id;
        prv.multipart.insert(prvdata, files, r.message.pub.id, function (err, body){
          if (!err) {
            r.message.prv = body;
            
            res.send(r); 
          } 
          else {
            console.error(err);
            res.status(403).send({
              success: false,
              message: err
            });
          }
        });
      }
      else {
        console.error(err);
        res.status(403).send({
          success: false,
          message: err
        });
      }
    });
  }
  else {
      console.info('No files selected');
      res.status(403).send({
        success: false,
        message: 'No files selected'
      });
  }
});

app.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function () {
  console.info("Example app listening on " + (process.env.IP || "0.0.0.0") + ":" + (process.env.PORT || 3000));
});