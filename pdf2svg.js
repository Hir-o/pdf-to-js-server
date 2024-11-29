/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

//
// Node tool to dump SVG output into a file.
//

const express = require('express');
const router = express.Router();
const FormData = require('form-data');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
var fs = require('fs');

// HACK few hacks to let PDF.js be loaded not as a module in global space.
global.window = global;
global.navigator = { userAgent: 'node' };
global.PDFJS = {};

PDFJS.workerSrc = true;
require('./js/pdf.combined.js');
require('./js/domstubs.js');


// Loading file from file system into typed array
//var pdfPath = process.argv[2] || 'test.pdf';
//var data = new Uint8Array(fs.readFileSync(pdfPath));
var newSvg;
const svgFilePath = './svgdump/converted.svg';

// Dumps svg outputs to a folder called svgdump
async function writeToFile(res, pdfPath, svgdump, pageNum) {
  var name = getFileNameFromPath(pdfPath);
  fs.mkdir('./svgdump/', function(err) {
    if (!err || err.code === 'EEXIST') {
      //fs.writeFile('./svgdump/' + name + "-" + pageNum + '.svg', svgdump,
        fs.writeFile(svgFilePath, svgdump, function(err) {
          if (err) {
            console.log('Error: ' + err);
          } else {
            //console.log('Page: ' + pageNum);
            if (fs.existsSync(svgFilePath)){
              newSvg = fs.readFileSync(svgFilePath);
              res.send(newSvg);
              fs.unlink(svgFilePath, (err) => {
                if (err)
                  console.error(`Error removing file: ${err}`);
              });
            }
            else
            {
              res.send('File not created!');
            }
          }
        });
    }
  });
}

function createIndex(pdfPath, numPages) {
  var name = getFileNameFromPath(pdfPath);
  var page= 1;

  // Read from a template file
  var html = fs.readFileSync('./template.html');
  var htmlend = '</div></div></div></body></html>';

  fs.writeFile('./index.html', html, function (err) {
    if (err) {
      console.log("Error");
    }
  });
  
  while (page <= numPages) {
    var attr = 'style="background-image:url(./svgdump/' + name + '-' + page++ + '.svg);"';
    var div = '<div class="sheet"' + attr + '></div>\n'
    fs.appendFile('./index.html', div, function(err) {
      if (err) {
        console.log("Error");
      }
    });
  }
  fs.appendFile('./index.html', htmlend, function (err) {
    if (err) {
      console.log("Error creating index file");
    }
  });
}

// Get filename from the path
function getFileNameFromPath(path) {
  var index = path.lastIndexOf('/');
  var extIndex = path.lastIndexOf('.');
  return path.substring(index , extIndex);
}

router.get('/', async(req, res) => {
  res.send('endpoint is working fine');
});

router.post('/convert', upload.single('pdf'), async(req, res) => {
  var form = new FormData();
  form.append('pdf', fs.createReadStream(req.file.destination + req.file.filename));

  try{
    newSvg = null;
    const pdfPath = req.file.path;
    const pdfData = new Uint8Array(fs.readFileSync(pdfPath));
    await convertPdfToSvg(res, pdfPath, pdfData);
  } catch(ex){
    res.send(ex.message);
  }
});

// Will be using promises to load document, pages and misc data instead of
// callback.


async function convertPdfToSvg(res, pdfPath, pdfData){
  await PDFJS.getDocument(pdfData).then(async function (doc) {
    var numPages = doc.numPages;
    //console.log('# Document Loaded');
    //console.log('Number of Pages: ' + numPages);
    //console.log();
  
    createIndex(pdfPath, numPages);
    var lastPromise = Promise.resolve(); // will be used to chain promises
    var loadPage = async function (pageNum) {
      return doc.getPage(pageNum).then(async function (page) {
        var viewport = page.getViewport(1.0 /* scale */);
        //console.log();
        
        return page.getOperatorList().then(async function (opList) {
          var svgGfx = new PDFJS.SVGGraphics(page.commonObjs, page.objs);
          svgGfx.embedFonts = true;
          return svgGfx.getSVG(opList, viewport).then(async function (svg) {
            var svgDump = svg.toString();
            await writeToFile(res, pdfPath, svgDump, pageNum);
          });
        });
      })
    };
    
    for (var i = 1; i <= numPages; i++) {
      lastPromise = lastPromise.then(loadPage.bind(null, i));
    }
    return lastPromise;
  }).then(function () {
    //console.log('# End of Document');
  }, function (err) {
    console.error('Error: ' + err);
  });
}

module.exports = router;