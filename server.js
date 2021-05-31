const express = require("express");
const path = require("path");
const app = express();
const port = 3000;

app.use('/js', express.static(path.join(__dirname, 'js')));
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: __dirname });
});




app.listen(port, () => console.log(`listening on port ${port}!`));