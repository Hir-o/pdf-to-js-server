const express = require('express');
const app = express();
const pdfToSvgConverter = require('./pdf2svg');
var cors = require('cors');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/pdfToSvg', pdfToSvgConverter);
app.use(cors());

const port = process.env.PORT || 5002;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});