const express = require('express')
const bodyParser = require('body-parser')
const Pdfer = require('./src/Pdfer.js');
const fs = require('fs');
var cors = require('cors')

const app = express()
app.use(cors())
app.use(bodyParser.json())

const port = 80

const getValidationErrors = (data) => {
  if (!data || !data.location) 
    return "no location data provided"
  if (!data.region) 
    return "no region provided"
  if (!data.url) 
    return "no URL provided"
  return null;
}

/**
 * Post route, accepts location JSON and sends PDF
 * file if the data is valid.  Otherwise, sends error.
 */
app.post('/', async function(req, res, next) {
  const pdfData = req.body;
  const error = getValidationErrors(pdfData);
  if (error) {
    res.send(error)
  } else {
    console.log(`generating pdf for ${pdfData.location.id}`)
    var filename = pdfData.location.id + ".pdf"; 
    filename = encodeURIComponent(filename);

    var pdfer = new Pdfer();
    await pdfer.pdf(pdfData, './src/assets/templates', './output/' + filename);
    var stream = fs.createReadStream('./output/' + filename);

    res.setHeader('Content-disposition', 'inline; filename="' + filename + '"');
    res.setHeader('Content-type', 'application/pdf');
  
    stream.pipe(res);
  }
})

app.listen(port, () => console.log(`PDF generator listening on port ${port}!`))