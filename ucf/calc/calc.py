from http import cookies
import requests
import re
import bs4
import math

res = requests.get('http://ctf.hackucf.org:4000/calc/calc.php')
print(res.cookies['PHPSESSID'])
phpsessid = res.cookies['PHPSESSID']
# clean the html tag in response
soup = bs4.BeautifulSoup(res.content, 'html.parser').get_text()
# clean whitespace and newline in soup
soup = re.sub(r"[\n\t\s]*", "", soup)
# get the substring between two markers in Python
# example: 9445+2762/6279*3375-7396
start = soup.find("way...") + len("way...")
end = soup.find("answer(hint")
expression = soup[start:end]
# calculate
result = math.floor(eval(expression))
print(expression)
answer = {'answer': str(result)}

cookies = dict(PHPSESSID=phpsessid)
send_the_answer = requests.post(
    'http://ctf.hackucf.org:4000/calc/calc.php', data=answer, cookies=cookies)

print(send_the_answer.text)
