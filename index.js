#!/usr/bin/env node

// const fs = require('node:fs');

// const rStream = fs.createReadStream('./hello.txt','utf8');
// const wStream = fs.createWriteStream('./stream.txt','utf8');

// rStream.on('data', (chunk) => {
//     console.log('\n===== Chunk ======\n', chunk);
//     wStream.write('\n ====== chunk ===== \n');
//     wStream.write(chunk);
// })
//============================================================
// console.log('Hello World');
// if(process.argv[2]=='add')
// {
//     console.log('you will add ',process.argv[3]);
// }
//============================================================

import { Command } from 'commander';
import inquirer from 'inquirer';
import fs from 'fs';

const program = new Command();

const questions = [
    {
        type: 'input',
        name: 'programming',
        message: 'please enter course title',
    },
    {
        type: 'number',
        name: 'price',
        message: 'please enter course price',
    }

];
program
    .name('course-manager')
    .description('CLI to make')
    .version('1.0.0');

const filePath = './Courses.json';


program
    .command('add')
    .alias('a')
    // .description('Add a course')
    // .argument('<title>', 'add course title' )
    // .option('--price <price>', 'add course price' )
    .action(() => {
        // console.log("param , option", param, option)
        inquirer
            .prompt(questions).then((answers) => {
                console.log(answers);

                if (fs.existsSync(filePath)) {
                    fs.readFile(filePath, 'utf8', (err, fileContent) => {
                        if (err) {
                            console.log(err)
                            process.exit();
                        }
                        console.log('file content', fileContent)
                        const fileContentAsJson = JSON.parse(fileContent);
                        fileContentAsJson.push(answers)
                        fs.writeFile('./Courses.json', JSON.stringify(fileContentAsJson), 'utf8', () => {
                            console.log('Courses update done!');
                        })
                    })

                } else {
                    fs.writeFile('./Courses.json', JSON.stringify([answers]), 'utf8', () => {
                        console.log('Courses add done!');
                    })
                }
            })
    })


program
    .command('list')
    .alias('l')
    .description('List all courses')
    .action(() => {
        fs.readFile(filePath, 'utf8', (err, content) => {
            if(err){
                console.log(err);
                process.exit();
            }
            console.table(JSON.parse(content))
        })
        console.log('courses')
    })



program.parse(process.argv);  