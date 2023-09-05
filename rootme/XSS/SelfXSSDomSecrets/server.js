const express = require('express');
const app = express();

const PORT = 5000;

const OUR_URL = 'https://bbf7-2001-ee1-fa03-c960-48e3-4a7-ec6b-fdd1.ngrok-free.app';

app.disable('etag');
app.set("view engine","ejs");
app.set("views","./views");

app.get('/execute', (req, res) => {
    res.render('execute', { OUR_URL });
});

app.get('/form', (req, res) => {
    res.render('form', { OUR_URL });
});

app.get('/flag', (req, res) => {
    let flag = req.query.flag;
    console.log(flag);
    res.send('hit the flag');
});

app.get('/main', (req, res) => {
    res.render('main', { OUR_URL });
});

app.get('/delay', function(req, res) {
    setTimeout(()=> {
        res.sendStatus(404);
    }, 20000)
});

app.get('/', (req, res) => {
    res.render('index', { OUR_URL });
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`);
});