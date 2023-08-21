import firebaseConfig from './config'
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc , onSnapshot } from 'firebase/firestore'
import { getDatabase, ref, onValue, get, child, update } from 'firebase/database';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { initializeApp } from 'firebase/app'

initializeApp(firebaseConfig)

//init services
//const db = getFirestore()
const db = getDatabase();
const auth = getAuth()
const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

const signUpForm = document.querySelector('.signup')
signUpForm.addEventListener('submit', (e) => {
    e.preventDefault()

    const email = signUpForm.email.value
    const password = signUpForm.password.value

    createUserWithEmailAndPassword(auth, email, password)
        .then((cred) => {
            console.log('User created: ', cred.user)
            signUpForm.reset()
        })
        .catch((err) => {
            console.log(err.message)
        })

})

// logging in and out
const logoutButton = document.querySelector('.logout')
logoutButton.addEventListener('click', () => {
    signOut(auth)
    .then(() => {
        console.log('user signed out')
    })
    .catch(err => {
        console.log(err.message)
    })
})

const loginForm = document.querySelector('.login')
loginForm.addEventListener('submit', (e) => {
    e.preventDefault()

    const email = loginForm.email.value
    const password = loginForm.password.value

    signInWithEmailAndPassword(auth, email, password)
    .then(cred => {
        console.log('user logged in:', cred.user)
        loginForm.reset()
    })
    .catch(err => {
        console.log(err.message)
    })
})

const usersRef = ref(db, 'users');

let data = {}

onValue(usersRef, (snapshot) => {
    console.log(snapshot.val());
    data = snapshot.val();
},  {
    onlyOnce: true
});


const chatroomsRef = ref(db, 'chatrooms');

onValue(chatroomsRef, (snapshot) => {
    console.log(snapshot.val());
    data = snapshot.val();
},  {
    onlyOnce: true
});

await sleep(5000)
console.log("Sleep done")

// const messagesRef = ref(db, 'messages');
for (const key in data) {
    if (data.hasOwnProperty(key)) {
        const uuid = data[key].chatroom.uuid;

        const participantsRef = child(chatroomsRef, `${uuid}/chatroom/participants`);
        update(participantsRef, {
            '0Imix4eQPjX3lXaO8yqcEM3i7yV2': 1,
        });
        
        const messagesRef = ref(db, '/messages/' + uuid);
        onValue(messagesRef, (snapshot) => {
            console.log(snapshot.val())
        })
    }
}

//#############################################################//
//collection ref
// const colRef = collection(db, 'books')

// //get collection data
// getDocs(colRef)
//     .then((snapshot) => {
//         // console.log(snapshot.docs)
//         let books = []
//         snapshot.docs.forEach((doc) => {
//             books.push({ ...doc.data(), id: doc.id })
//         })
//         console.log(books)
//     })
//     .catch(err => {
//         console.log(err.message)
//     })

// real time collection data
// onSnapshot(colRef, (snapshot) => {
//     let books = []
//     snapshot.docs.forEach((doc) => {
//         books.push({ ...doc.data(), id: doc.id })
//     })
//     console.log(books)
// })

//adding documents
// const addBookForm = document.querySelector('.add')
// addBookForm.addEventListener('submit', (e) => {
//     e.preventDefault()

//     addDoc(colRef, {
//         title: addBookForm.title.value,
//         author: addBookForm.author.value,
//     })
//         .then(() => {
//         addBookForm.reset()
//     })

// })

//deleting documents
// const deleteBookForm = document.querySelector('.delete')
// deleteBookForm.addEventListener('submit', (e) => {
//     e.preventDefault()

//     const docRef = doc(db, 'books', deleteBookForm.id.value)

//     deleteDoc(docRef)
//         .then(() => {
//             deleteBookForm.reset()
//         })
// })
//#############################################################//