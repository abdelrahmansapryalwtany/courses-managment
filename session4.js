// import http from "http";

// const server = http.createServer((req,res)=>{
//     res.write('<h1>Hello World!</h1>')
//     res.write(JSON.stringify({
//         id: 5,
//         name: "ahmed"
//     }))
//     res.end()
// })

// server.listen(5000, 'localhost', ()=>{
//     console.log("Listening on port 5000");
// })

import express from 'express'

const app = express();

app.use((req, res, next) => {
    console.log(req.url, req.method)
    next();
})

app.use((req, res, next) => {
    console.log("Midelware 2")
    next();
})

app.get('/', (req, res) => {
    res.send("Hellow from Home Page")
})

app.get('/about', (req, res) => {
    res.send("Hellow from About Page")
})

app.get('/products', (req, res) => {
    res.send([{
        id: 5,
        name: "ahmed",
    },
{
        id: 56,
        name: 'ali'
    }])
})

app.get('/', (req, res) => {
    res.send("Hellow from Home Page")
})

app.listen('5001',() => {
    console.log('Listening from port 5001')
})