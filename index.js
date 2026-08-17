// #!/usr/bin/env node

// // const fs = require('node:fs');

// // const rStream = fs.createReadStream('./hello.txt','utf8');
// // const wStream = fs.createWriteStream('./stream.txt','utf8');

// // rStream.on('data', (chunk) => {
// //     console.log('\n===== Chunk ======\n', chunk);
// //     wStream.write('\n ====== chunk ===== \n');
// //     wStream.write(chunk);
// // })
// //============================================================
// // console.log('Hello World');
// // if(process.argv[2]=='add')
// // {
// //     console.log('you will add ',process.argv[3]);
// // }
// //============================================================

// import { Command } from 'commander';
// import inquirer from 'inquirer';
// import fs from 'fs';

// const program = new Command();

// const questions = [
//     {
//         type: 'input',
//         name: 'programming',
//         message: 'please enter course title',
//     },
//     {
//         type: 'number',
//         name: 'price',
//         message: 'please enter course price',
//     }

// ];
// program
//     .name('course-manager')
//     .description('CLI to make')
//     .version('1.0.0');

// const filePath = './Courses.json';


// program
//     .command('add')
//     .alias('a')
//     // .description('Add a course')
//     // .argument('<title>', 'add course title' )
//     // .option('--price <price>', 'add course price' )
//     .action(() => {
//         // console.log("param , option", param, option)
//         inquirer
//             .prompt(questions).then((answers) => {
//                 console.log(answers);

//                 if (fs.existsSync(filePath)) {
//                     fs.readFile(filePath, 'utf8', (err, fileContent) => {
//                         if (err) {
//                             console.log(err)
//                             process.exit();
//                         }
//                         console.log('file content', fileContent)
//                         const fileContentAsJson = JSON.parse(fileContent);
//                         fileContentAsJson.push(answers)
//                         fs.writeFile('./Courses.json', JSON.stringify(fileContentAsJson), 'utf8', () => {
//                             console.log('Courses update done!');
//                         })
//                     })

//                 } else {
//                     fs.writeFile('./Courses.json', JSON.stringify([answers]), 'utf8', () => {
//                         console.log('Courses add done!');
//                     })
//                 }
//             })
//     })


// program
//     .command('list')
//     .alias('l')
//     .description('List all courses')
//     .action(() => {
//         fs.readFile(filePath, 'utf8', (err, content) => {
//             if(err){
//                 console.log(err);
//                 process.exit();
//             }
//             console.table(JSON.parse(content))
//         })
//         console.log('courses')
//     })



// program.parse(process.argv);  


import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { FAIL } from './utils/httpStatusTest.js';
import cors from 'cors';
import coursesRouter from './routes/courses.route.js'
import usersRouter from './routes/users.route.js'
import path from 'path';

dotenv.config();

const url = process.env.MONGO_URI;

mongoose.connect(url).then(() => {
    console.log('Mongo db server started');
});


const app = express();

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use(express.json());
app.use(cors());

app.use('/api/courses', coursesRouter)
app.use('/api/users', usersRouter)

app.all('{*splat}', (req, res, next) => {
    return res.status(404).json({ status: 'ERROR', data: { msg: 'route not found' } });
});

app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({ status: err.statusText || 'ERROR', message: err.message || 'something went wrong', code: err.statusCode || 500, data: null });
});

app.listen(process.env.PORT || 4000, () => {
    console.log('listening on port : 4000')
});