// import fs from 'fs';
// console.log("first");
// // const content = fs.readFileSync('./h2.txt', 'utf8');
// // console.log(content);
// const content = fs.readFile('./h2.txt', 'utf8', (err, content) => {
//     console.log(content);
// });
// console.log("Second");

// import crypto from 'crypto'

// const start = performance.now();


//  crypto.pbkdf2Sync('secret', 'salt', 100000, 64, 'sha512')
//  console.log('time for crypto in ms equal ', performance.now() - start);

//  crypto.pbkdf2Sync('secret', 'salt', 100000, 64, 'sha512')
//  console.log('time for crypto in ms equal ', performance.now() - start);

//  crypto.pbkdf2Sync('secret', 'salt', 100000, 64, 'sha512')
//  console.log('time for crypto in ms equal ', performance.now() - start);

//  crypto.pbkdf2Sync('secret', 'salt', 100000, 64, 'sha512')
//  console.log('time for crypto in ms equal ', performance.now() - start);


//========================================================================================

// process.env.UV_THREADPOOL_SIZE=5

//  crypto.pbkdf2('secret', 'salt', 100000, 64, 'sha512', () => {
//      console.log('time for crypto in ms equal ', performance.now() - start);
//  })
//  crypto.pbkdf2('secret', 'salt', 100000, 64, 'sha512', () => {
//      console.log('time for crypto in ms equal ', performance.now() - start);
//  })
//  crypto.pbkdf2('secret', 'salt', 100000, 64, 'sha512', () => {
//      console.log('time for crypto in ms equal ', performance.now() - start);
//  })
//  crypto.pbkdf2('secret', 'salt', 100000, 64, 'sha512', () => {
//      console.log('time for crypto in ms equal ', performance.now() - start);
//  })

//  crypto.pbkdf2('secret', 'salt', 100000, 64, 'sha512', () => {
//      console.log('time for crypto in ms equal ', performance.now() - start);
//  })


//========================================================================================

// import fs from "fs"

// const answer = fs.readFileSync("answer.txt", "utf8").trim();
// console.log(answer)
// if (answer === "hello") {
    //   console.log("Correct ");
    // } else {
        //   console.log("Wrong ");
        // }
        
        
//========================================================================================
        
// let answer = "";

// fs.readFile("answer.txt", "utf8", (err, data) => {
//     answer = data.trim();
//     console.log(answer);
// });

// if (answer === "hello") {
//   console.log("Correct ");
// } else {
//   console.log("Wrong ");
// }

//========================================================================================

// fetch("https://dummyjson.com/products").then(()=>{
// console.log('time for request in ms equal ', performance.now() - start);
// })
// fetch("https://dummyjson.com/products").then(()=>{
// console.log('time for request in ms equal ', performance.now() - start);
// })
// fetch("https://dummyjson.com/products").then(()=>{
// console.log('time for request in ms equal ', performance.now() - start);
// })
// fetch("https://dummyjson.com/products").then(()=>{
// console.log('time for request in ms equal ', performance.now() - start);
// })
// fetch("https://dummyjson.com/products").then(()=>{
// console.log('time for request in ms equal ', performance.now() - start);
// })
// fetch("https://dummyjson.com/products").then(()=>{
// console.log('time for request in ms equal ', performance.now() - start);
// })
// fetch("https://dummyjson.com/products").then(()=>{
// console.log('time for request in ms equal ', performance.now() - start);
// })
// fetch("https://dummyjson.com/products").then(()=>{
// console.log('time for request in ms equal ', performance.now() - start);
// })

//====================================================================================================


import http from 'http';

const server = http.createServer((req, res) => {
    // res.end("Hello World!");
    if(req.url === '/'){
        res.end("Home page");
    }
    else if(req.url === '/about'){
        res.end("About page");
    }
    else if(req.url === '/contact'){
        res.end("Contact page");
    }else{
         res.end("Not Found Page");
    }
})

server.listen(3001, () => {
    console.log("listening on port 3001")
})