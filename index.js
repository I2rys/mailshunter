"use strict";

// Dependencies
const puppeteer = require("puppeteer")
const request = require("request")
const chalk = require("chalk")
const delay = require("delay")
const fs = require("fs")

// Variables
const args = process.argv.slice(2)

var MailsHunter = {
    links: [],
    emails: [],
    dork: ""
}

// Functions
async function dump(){
    const browser = await puppeteer.launch({ headless: true, argvs: ["--no-sandbox", "--disable-setuid-sandbox"] })
    const page = await browser.newPage()

    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.97 Safari/537.36")
    await page.goto(`https://www.bing.com/search?q=site:pastebin.com intext:(${MailsHunter.dork})`)

    const pageContent = await page.content()

    if(pageContent.indexOf("There are no results for") !== -1){
        console.log(`${chalk.grey("[") + chalk.yellowBright("WARNING") + chalk.grey("]")} Something went wrong while gathering some links, please try again later.`)
        console.log(`${chalk.grey("[") + chalk.blueBright("INFO") + chalk.grey("]")} Aborting..`)
        return browser.close()
    }

    var pageIndex = 1

    await page.waitForSelector("#b_results > li> h2 > a").catch(()=>{
        console.log(`${chalk.grey("[") + chalk.yellowBright("WARNING") + chalk.grey("]")} Something went wrong while gathering some links, please try again later.`)
        console.log(`${chalk.grey("[") + chalk.blueBright("INFO") + chalk.grey("]")} Aborting..`)
        browser.close()
        process.exit()
    })

    const links = await page.$$eval("#b_results > li> h2 > a", elems =>{
        return elems.map(elem => elem.getAttribute("href"))
    })

    for( const link of links ) MailsHunter.links.push(link)

    pageIndex += 1

    grabber()
    async function grabber(){
        await page.click(`#b_results > li.b_pag > nav > ul > li:nth-of-type(${pageIndex}) > a`).catch(()=>{
            console.log(`${chalk.grey("[") + chalk.yellowBright("WARNING") + chalk.grey("]")} Max page detected, aborting links gatherer.`)
            console.log(`${chalk.grey("[") + chalk.blueBright("INFO") + chalk.grey("]")} ${MailsHunter.links.length} links has been gathered. Continuing to phase 2.`)
            browser.close()
            return ES(page)
        })

        await page.waitForSelector("#b_results > li> h2 > a")

        const links = await page.$$eval("#b_results > li> h2 > a", elems =>{
            return elems.map(elem => elem.getAttribute("href"))
        })
    
        for( const link of links ) MailsHunter.links.push(link)

        if(pageIndex == args[1]){
            console.log(`${chalk.grey("[") + chalk.blueBright("INFO") + chalk.grey("]")} ${MailsHunter.links.length} links has been gathered. Continuing to phase 2.`)
            await browser.close()
            return ES(page)
        }
    
        pageIndex++

        grabber()
    }
}

async function ES(page){
    if(MailsHunter.links.length == 0){
        console.log(`${chalk.grey("[") + chalk.yellowBright("WARNING") + chalk.grey("]")} No links found on MailsHunter data.`)
        console.log(`${chalk.grey("[") + chalk.blueBright("INFO") + chalk.grey("]")} Aborting..`)
        process.exit()
    }

    var linkIndex = 0

    grabber()
    async function grabber(){
        request(`${MailsHunter.links[linkIndex]}`, function(err, res, body){
            if(err){
                linkIndex++
                return grabber()
            }

            parse()
            async function parse(){
                await delay(1000)

                const emails = body.match(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9.-]+/g)

                if(emails == null){
                    linkIndex++
    
                    if(linkIndex == MailsHunter.links.length){
                        console.log(`${chalk.grey("[") + chalk.blueBright("INFO") + chalk.grey("]")} ${MailsHunter.emails.length} emails found. Continuing to the final phase.`)
                        return finish()
                    }
    
                    grabber()
                    return
                }else{
                    linkIndex++
    
                    for( const email of emails ) if(email.indexOf(".") !== -1) MailsHunter.emails.push(email)
    
                    if(linkIndex === MailsHunter.links.length){
                        console.log(`${chalk.grey("[") + chalk.blueBright("INFO") + chalk.grey("]")} ${MailsHunter.emails.length} emails found. Continuing to the final phase.`)
                        return finish()
                    }
    
                    grabber()
                    return
                }
            }
        })
    }
}

function finish(){
    if(MailsHunter.emails.length == 0) return console.log(`${chalk.grey("[") + chalk.blueBright("INFO") + chalk.grey("]")} No emails found, exiting.`)

    const emails = []

    console.log(`${chalk.grey("[") + chalk.blueBright("INFO") + chalk.grey("]")} Saving the emails that has been found to the output you specified.`)

    for( const email of MailsHunter.emails ) emails.push(email)

    fs.writeFileSync(args[2], emails.join("\n"), "utf8")

    console.log(`${chalk.grey("[") + chalk.blueBright("INFO") + chalk.grey("]")} Emails has been saved, exiting.`)
}

// Main
if(!args.length) return console.log(`node index.js <emailServices> <maxPage> <output>`)

for( const service of args[0].split(":") ) MailsHunter.dork.length ? MailsHunter.dork = service : MailsHunter.dork += ` OR ${service}`

console.log(`${chalk.grey("[") + chalk.blueBright("INFO") + chalk.grey("]")} Looks like the arguments are good. Continuing to phase 1.`)
dump()