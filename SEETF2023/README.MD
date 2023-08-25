# 
## MANDATORY NOTES
Trong thời gian diễn ra giải thì mình đang bận bịu với đồ án mật mã học nên cũng chưa có thời gian để xem kĩ bài này.

Thực chất ý tưởng của bài này khá là dễ, đọc qua là đã biết xsleak rồi.

```js
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const path = require('path');

const app = express();

app.use(express.static('static'))

app.use(session({
    secret: crypto.randomBytes(64).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: { sameSite: 'lax' }
}))

app.use(bodyParser.urlencoded({ extended: false }));

const initSession = (req, res, next) => {
    if (!req.session.notes) {
        req.session.notes = [];
    }
    next();
}

app.get('/', initSession, (req, res) => {
    const query = req.query.q;

    if (!query) {
        return res.sendFile(path.join(__dirname, 'index.html'));
    }

    const found = req.session.notes.filter(note => note.text.includes(query));

    if (!found.length) {
        return res.redirect('/?found=0');
    }
    return res.redirect(`/?found=1#${btoa(JSON.stringify(found.map(note => note.id)))}`);
})

app.post('/save', initSession, (req, res) => {
    req.session.notes.push({ id: req.session.notes.length, text: req.body.note });
    return res.redirect('/');
})

app.get('/notes', initSession, (req, res) => {
    return res.json(req.session.notes);
})

app.listen(80, () => console.log('Listening on port 80'));
```

Sơ qua về code phía server:
- Khi người dùng lưu note ở route `/save` thì note sẽ được lưu ở trong session.
- Query `/?q=xyz` sẽ tìm notes liên quan đến q, nếu tìm thấy thì sẽ thực hiện `res.redirect(`/?found=1#${btoa(JSON.stringify(found.map(note => note.id)))}`);`. Sau dấu `#` sẽ là based64 mảng chứa id các note được tìm thấy ví dụ `[0,3]`.
- Cookie được set là `samesite: lax`


Code phía client:
```js
const notesEl = document.getElementById('notes')

let isSearch = false
let searchResults = []

if (new URLSearchParams(location.search).get('found') === '1' && location.hash) {
    searchResults = JSON.parse(atob(location.hash.slice(1)))
    isSearch = true
}

const loadNotes = (notes) => {
    if (!notes.length) {
        const noteEl = document.createElement('p')
        noteEl.textContent = 'No notes found'
        notesEl.appendChild(noteEl)
        return
    }

    notes.forEach(note => {
        if (isSearch && !searchResults.includes(note.id)) return
        const noteEl = document.createElement('p')
        noteEl.textContent = note.text
        notesEl.appendChild(noteEl)
    })
}

fetch('/notes')
    .then(res => res.json())
    .then(notes => loadNotes(notes))
```

Hành động của admin bot:
```js
import puppeteer from 'puppeteer'
import express from 'express'
import rateLimit from 'express-rate-limit'

const app = express()
app.use(express.static('static'))
app.use(express.json())

const port = 80

async function visit(url) {

    const browser = await puppeteer.launch({
        dumpio: true,
        pipe: true,
        args: [
            '--js-flags=--jitless,--no-expose-wasm',
            '--disable-gpu',
            '--disable-dev-shm-usage'
        ]
    })

    const ctx = await browser.createIncognitoBrowserContext()
    const page = await ctx.newPage()

    try {
        await page.goto('http://192.168.83.130:8000', { timeout: 5000, waitUntil: 'networkidle2' })
        await page.type("#note", process.env.FLAG)
        await page.click("#submit")
        
        // Go to your URL
        await page.goto(url, { timeout: 10000, waitUntil: 'networkidle2' })
        await page.waitForTimeout(30000)
    } finally {
        await page.close()
        await ctx.close()
    }

    await browser.close()
}

app.use(
    '/visit',
    rateLimit({
        windowMs: 60 * 1000,
        max: 3, // 3 requests per minute
        message: { error: 'Too many requests, try again later' }
    })
)

app.post('/visit', async (req, res) => {
    const url = req.body.url
    if (
        url === undefined ||
        (!url.startsWith('http://') && !url.startsWith('https://'))
    ) {
        return res.status(400).send({ error: 'Invalid URL' })
    }

    try {
        console.log(`[*] Visiting ${url}`)
        await visit(url)
        console.log(`[*] Done visiting ${url}`)
        return res.sendStatus(200)
    } catch (e) {
        console.error(`[-] Error visiting ${url}: ${e.message}`)
        return res.status(400).send({ error: e.message })
    }
})

app.listen(port, async () => {
    console.log(`[*] Listening on port ${port}`)
})
```

Set flag vào note và visit đến site mà ta đưa vào.

Ý tưởng: Lợi dụng URL limit 2MB trong Chrome
- Làm cho để độ dài khi query nhỏ hơn 2MB, do đó khi điều hướng đến ?found=0 với phần fragment sẽ vừa đủ 2MB và gây ra `about:blank#block`
- Nếu tìm kiếm có thì fragment mới sẽ thay phần `#AAA...AAA` nên sẽ không aborted.

